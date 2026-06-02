'use strict';

const express = require('express');
const router = express.Router();

const ReservationModel = require('../models/ReservationModel');
const { requireAuth } = require('../middleware/auth');
const { sanitizeString, isPositiveInt, isValidDate } = require('../middleware/validation');

/**
 * GET /api/reservations/my
 * Return all reservations for the logged-in student.
 */
router.get('/my', requireAuth, async (req, res) => {
  try {
    const reservations = await ReservationModel.findByUser(req.user.id);
    return res.json({ reservations });
  } catch (err) {
    console.error('My reservations error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve your reservations.' });
  }
});

/**
 * GET /api/reservations/room/:roomId
 * Get active reservations for a room within a date range.
 * Query: ?from=ISO&to=ISO
 */
router.get('/room/:roomId', requireAuth, async (req, res) => {
  try {
    if (!isPositiveInt(req.params.roomId)) {
      return res.status(400).json({ error: 'Invalid room ID.' });
    }

    const from = req.query.from || new Date().toISOString();
    const to   = req.query.to   || new Date(Date.now() + 7 * 86400000).toISOString();

    if (!isValidDate(from) || !isValidDate(to)) {
      return res.status(400).json({ error: 'Invalid date range.' });
    }

    const reservations = await ReservationModel.findByRoomAndRange(
      req.params.roomId, from, to
    );
    return res.json({ reservations });
  } catch (err) {
    console.error('Room reservations error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve room schedule.' });
  }
});

/**
 * POST /api/reservations
 * Create a new reservation (students only — conflict check enforced).
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const data = {
      user_id:    req.user.id,
      room_id:    req.body.room_id,
      start_time: req.body.start_time,
      end_time:   req.body.end_time,
      purpose:    sanitizeString(req.body.purpose || '')
    };

    const { valid, errors } = ReservationModel.validate(data);
    if (!valid) return res.status(400).json({ error: errors.join(' ') });

    const conflict = await ReservationModel.checkConflict(
      data.room_id, data.start_time, data.end_time
    );
    if (conflict) {
      return res.status(409).json({
        error: 'This time slot is already booked for the selected room. Please choose a different time.'
      });
    }

    const reservation = await ReservationModel.create(data);
    return res.status(201).json({ reservation });
  } catch (err) {
    console.error('Create reservation error:', err.message);
    return res.status(500).json({ error: 'Could not create reservation.' });
  }
});

/**
 * DELETE /api/reservations/:id
 * Cancel a reservation. Students can only cancel their own; admins cancel any.
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!isPositiveInt(req.params.id)) {
      return res.status(400).json({ error: 'Invalid reservation ID.' });
    }

    const userId = req.user.role === 'admin' ? null : req.user.id;
    const reservation = await ReservationModel.cancel(req.params.id, userId);

    if (!reservation) {
      return res.status(404).json({
        error: 'Reservation not found or you do not have permission to cancel it.'
      });
    }
    return res.json({ message: 'Reservation cancelled.', reservation });
  } catch (err) {
    console.error('Cancel reservation error:', err.message);
    return res.status(500).json({ error: 'Could not cancel reservation.' });
  }
});

module.exports = router;
