'use strict';

const express = require('express');
const router = express.Router();

const ReservationModel = require('../models/ReservationModel');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { isValidDate } = require('../middleware/validation');

/**
 * GET /api/reports/room-usage
 * Admin: room utilization summary between two dates.
 * Query: ?from=ISO&to=ISO
 */
router.get('/room-usage', requireAuth, requireAdmin, async (req, res) => {
  try {
    const from = req.query.from;
    const to   = req.query.to;

    if (!from || !to || !isValidDate(from) || !isValidDate(to)) {
      return res.status(400).json({
        error: 'Please provide valid "from" and "to" query parameters (ISO datetime).'
      });
    }

    if (new Date(to) <= new Date(from)) {
      return res.status(400).json({ error: '"to" must be later than "from".' });
    }

    const rows = await ReservationModel.roomUsageReport(from, to);

    return res.json({
      title:              'Room Usage Report',
      generated_at:       new Date().toISOString(),
      period_from:        from,
      period_to:          to,
      rows
    });
  } catch (err) {
    console.error('Room usage report error:', err.message);
    return res.status(500).json({ error: 'Could not generate report.' });
  }
});

/**
 * GET /api/reports/reservations
 * Admin: detailed reservation list for a date range.
 * Query: ?from=ISO&to=ISO&status=active|cancelled
 */
router.get('/reservations', requireAuth, requireAdmin, async (req, res) => {
  try {
    const from   = req.query.from;
    const to     = req.query.to;
    const status = req.query.status || '';

    if (!from || !to || !isValidDate(from) || !isValidDate(to)) {
      return res.status(400).json({
        error: 'Please provide valid "from" and "to" query parameters.'
      });
    }

    const filters = { from, to };
    if (status && ['active', 'cancelled'].includes(status)) {
      filters.status = status;
    }

    const reservations = await ReservationModel.findAllDetailed(filters);

    return res.json({
      title:        'Reservation Detail Report',
      generated_at: new Date().toISOString(),
      period_from:  from,
      period_to:    to,
      status_filter: status || 'all',
      count:        reservations.length,
      reservations
    });
  } catch (err) {
    console.error('Reservation report error:', err.message);
    return res.status(500).json({ error: 'Could not generate report.' });
  }
});

module.exports = router;
