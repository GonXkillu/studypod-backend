'use strict';

const express = require('express');
const router = express.Router();

const RoomModel = require('../models/RoomModel');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sanitizeString, isPositiveInt } = require('../middleware/validation');

/**
 * GET /api/rooms
 * List all active rooms. Accepts optional ?search= query param.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const search = req.query.search ? sanitizeString(req.query.search) : '';
    const rooms  = search
      ? await RoomModel.search(search)
      : await RoomModel.findActive();
    return res.json({ rooms });
  } catch (err) {
    console.error('List rooms error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve rooms.' });
  }
});

/**
 * GET /api/rooms/all
 * Admin: list all rooms even inactive ones.
 */
router.get('/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rooms = await RoomModel.findAll('', [], 'name ASC');
    return res.json({ rooms });
  } catch (err) {
    console.error('List all rooms error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve rooms.' });
  }
});

/**
 * GET /api/rooms/:id
 * Get a single room by id.
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!isPositiveInt(req.params.id)) {
      return res.status(400).json({ error: 'Invalid room ID.' });
    }
    const room = await RoomModel.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    return res.json({ room });
  } catch (err) {
    console.error('Get room error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve room.' });
  }
});

/**
 * POST /api/rooms
 * Admin: add a new study room.
 */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = {
      name:        sanitizeString(req.body.name),
      capacity:    req.body.capacity,
      location:    sanitizeString(req.body.location   || ''),
      description: sanitizeString(req.body.description || '')
    };

    const { valid, errors } = RoomModel.validate(data);
    if (!valid) return res.status(400).json({ error: errors.join(' ') });

    const room = await RoomModel.create(data);
    return res.status(201).json({ room });
  } catch (err) {
    console.error('Create room error:', err.message);
    return res.status(500).json({ error: 'Could not create room.' });
  }
});

/**
 * PUT /api/rooms/:id
 * Admin: update a room's details.
 */
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!isPositiveInt(req.params.id)) {
      return res.status(400).json({ error: 'Invalid room ID.' });
    }

    const fields = {};
    if (req.body.name        !== undefined) fields.name        = sanitizeString(req.body.name);
    if (req.body.capacity    !== undefined) fields.capacity    = parseInt(req.body.capacity, 10);
    if (req.body.location    !== undefined) fields.location    = sanitizeString(req.body.location);
    if (req.body.description !== undefined) fields.description = sanitizeString(req.body.description);
    if (req.body.is_active   !== undefined) fields.is_active   = Boolean(req.body.is_active);

    const room = await RoomModel.update(req.params.id, fields);
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    return res.json({ room });
  } catch (err) {
    console.error('Update room error:', err.message);
    return res.status(500).json({ error: 'Could not update room.' });
  }
});

/**
 * DELETE /api/rooms/:id
 * Admin: permanently delete a room (only if it has no active reservations).
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!isPositiveInt(req.params.id)) {
      return res.status(400).json({ error: 'Invalid room ID.' });
    }
    const room = await RoomModel.deleteById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    return res.json({ message: 'Room deleted.', room });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'Cannot delete a room that has existing reservations. Deactivate it instead.'
      });
    }
    console.error('Delete room error:', err.message);
    return res.status(500).json({ error: 'Could not delete room.' });
  }
});

module.exports = router;
