'use strict';

const BaseModel = require('./BaseModel');

/**
 * ReservationModel inherits from BaseModel.
 * Handles reservation creation, conflict detection, and reporting.
 */
class ReservationModel extends BaseModel {
  constructor() {
    super('reservations');
  }

  /**
   * Polymorphic override of BaseModel.validate().
   * Enforces reservation specific field rules.
   */
  validate(data) {
    const errors = [];
    const { room_id, start_time, end_time } = data;

    if (!room_id || isNaN(parseInt(room_id, 10))) {
      errors.push('A valid room must be selected.');
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (isNaN(start.getTime())) {
      errors.push('Start time is not a valid date.');
    }
    if (isNaN(end.getTime())) {
      errors.push('End time is not a valid date.');
    }
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      if (end <= start) {
        errors.push('End time must be after start time.');
      }
      const durationHours = (end - start) / 36e5;
      if (durationHours > 4) {
        errors.push('Reservations cannot exceed 4 hours.');
      }
      if (start < new Date()) {
        errors.push('Reservations cannot be made in the past.');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check whether a time slot is already taken for a room.
   * Returns the conflicting reservation or null if the slot is free.
   * @param {number} roomId
   * @param {string} startTime
   * @param {string} endTime
   * @param {number|null} excludeId  reservation to exclude (for edits)
   */
  async checkConflict(roomId, startTime, endTime, excludeId = null) {
    const excludeClause = excludeId ? 'AND id != $4' : '';
    const params = [roomId, startTime, endTime];
    if (excludeId) params.push(excludeId);

    const { rows } = await this.query(
      `SELECT * FROM reservations
       WHERE room_id = $1
         AND status = 'active'
         AND start_time < $3
         AND end_time   > $2
         ${excludeClause}
       LIMIT 1`,
      params
    );
    return rows[0] || null;
  }

  /**
   * Create a new reservation after conflict check passes.
   */
  async create({ user_id, room_id, start_time, end_time, purpose = '' }) {
    const { rows } = await this.query(
      `INSERT INTO reservations (user_id, room_id, start_time, end_time, purpose)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, parseInt(room_id, 10), start_time, end_time, purpose.trim()]
    );
    return rows[0];
  }

  /**
   * Cancel a reservation (soft delete: sets status = 'cancelled').
   * @param {number} id
   * @param {number} userId   pass null to skip ownership check (admin)
   */
  async cancel(id, userId = null) {
    const ownerClause = userId ? 'AND user_id = $2' : '';
    const params = userId ? [id, userId] : [id];
    const { rows } = await this.query(
      `UPDATE reservations
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 ${ownerClause}
       RETURNING *`,
      params
    );
    return rows[0] || null;
  }

  /**
   * Get all reservations for a user +  room name .
   */
  async findByUser(userId) {
    const { rows } = await this.query(
      `SELECT r.*, rm.name AS room_name, rm.location
       FROM reservations r
       JOIN rooms rm ON rm.id = r.room_id
       WHERE r.user_id = $1
       ORDER BY r.start_time DESC`,
      [userId]
    );
    return rows;
  }

  /**
   * Get all reservations for a room between two datetimes.
   */
  async findByRoomAndRange(roomId, from, to) {
    const { rows } = await this.query(
      `SELECT r.*, u.name AS student_name
       FROM reservations r
       JOIN users u ON u.id = r.user_id
       WHERE r.room_id = $1
         AND r.status = 'active'
         AND r.start_time >= $2
         AND r.end_time   <= $3
       ORDER BY r.start_time ASC`,
      [roomId, from, to]
    );
    return rows;
  }

  /**
   * Admin view: all reservations with user and room details.
   */
  async findAllDetailed(filters = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (filters.status) {
      conditions.push(`r.status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.room_id) {
      conditions.push(`r.room_id = $${idx++}`);
      params.push(filters.room_id);
    }
    if (filters.from) {
      conditions.push(`r.start_time >= $${idx++}`);
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`r.end_time <= $${idx++}`);
      params.push(filters.to);
    }
    if (filters.search) {
      conditions.push(`(LOWER(u.name) LIKE $${idx} OR LOWER(rm.name) LIKE $${idx})`);
      params.push(`%${filters.search.toLowerCase()}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await this.query(
      `SELECT
         r.id,
         r.start_time,
         r.end_time,
         r.purpose,
         r.status,
         r.created_at,
         r.updated_at,
         u.name  AS student_name,
         u.email AS student_email,
         rm.name AS room_name,
         rm.location
       FROM reservations r
       JOIN users  u  ON u.id  = r.user_id
       JOIN rooms  rm ON rm.id = r.room_id
       ${where}
       ORDER BY r.start_time DESC`,
      params
    );
    return rows;
  }

  /**
   * Generate a summary report grouped by room.
   * Used for the Admins Reports page.
   */
  async roomUsageReport(from, to) {
    const { rows } = await this.query(
      `SELECT
         rm.name                               AS room_name,
         rm.location,
         COUNT(r.id)                           AS total_reservations,
         COUNT(CASE WHEN r.status = 'active' THEN 1 END)     AS active_count,
         COUNT(CASE WHEN r.status = 'cancelled' THEN 1 END)  AS cancelled_count,
         MIN(r.start_time)                     AS earliest,
         MAX(r.end_time)                       AS latest,
         NOW()                                 AS report_generated_at
       FROM rooms rm
       LEFT JOIN reservations r
         ON r.room_id = rm.id
         AND r.start_time >= $1
         AND r.end_time   <= $2
       GROUP BY rm.id, rm.name, rm.location
       ORDER BY total_reservations DESC`,
      [from, to]
    );
    return rows;
  }
}

module.exports = new ReservationModel();
