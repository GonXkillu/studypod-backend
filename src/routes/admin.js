'use strict';

const express = require('express');
const router = express.Router();

const ReservationModel = require('../models/ReservationModel');
const UserModel        = require('../models/UserModel');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sanitizeString, isPositiveInt } = require('../middleware/validation');

/**
 * GET /api/admin/reservations
 * All reservations with full details. Supports filtering via query params:
 *   ?status=active|cancelled  ?room_id=  ?from=ISO  ?to=ISO  ?search=
 */
router.get('/reservations', requireAuth, requireAdmin, async (req, res) => {
  try {
    const filters = {};
    if (req.query.status)  filters.status  = sanitizeString(req.query.status);
    if (req.query.room_id && isPositiveInt(req.query.room_id))
      filters.room_id = parseInt(req.query.room_id, 10);
    if (req.query.from)    filters.from    = req.query.from;
    if (req.query.to)      filters.to      = req.query.to;
    if (req.query.search)  filters.search  = sanitizeString(req.query.search);

    const reservations = await ReservationModel.findAllDetailed(filters);
    return res.json({ reservations });
  } catch (err) {
    console.error('Admin reservations error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve reservations.' });
  }
});

/**
 * GET /api/admin/users
 * List all users (admin only).
 */
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await UserModel.findAll('', [], 'created_at DESC');
    return res.json({ users: users.map(UserModel.toPublic) });
  } catch (err) {
    console.error('Admin users error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve users.' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update a user's role (promote/demote).
 */
router.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!isPositiveInt(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }
    const allowed = ['student', 'admin'];
    const role = sanitizeString(req.body.role || '');
    if (!allowed.includes(role)) {
      return res.status(400).json({ error: 'Role must be "student" or "admin".' });
    }
    const user = await UserModel.update(req.params.id, { role });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user });
  } catch (err) {
    console.error('Update user error:', err.message);
    return res.status(500).json({ error: 'Could not update user.' });
  }
});

module.exports = router;
