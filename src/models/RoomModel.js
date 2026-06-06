'use strict';

const BaseModel = require('./BaseModel');

/**
 * RoomModel inherits from BaseModel .
 * Manages study room + pod records.
 */
class RoomModel extends BaseModel {
  constructor() {
    super('rooms');
  }

  /**
   * Polymorphic override of BaseModel.validate().
   * Enforces room specific field rules.
   */
  validate(data) {
    const errors = [];
    const { name, capacity } = data;

    if (!name || name.trim().length < 2) {
      errors.push('Room name must be at least 2 characters.');
    }

    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap < 1) {
      errors.push('Capacity must be a positive integer.');
    }
    if (cap > 100) {
      errors.push('Capacity cannot exceed 100.');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Return all active rooms in order by name.
   */
  async findActive() {
    return this.findAll('is_active = $1', [true], 'name ASC');
  }

  /**
   * Create a new room.
   * @param {{ name, capacity, location, description }} data
   */
  async create({ name, capacity, location = '', description = '' }) {
    const { rows } = await this.query(
      `INSERT INTO rooms (name, capacity, location, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), parseInt(capacity, 10), location.trim(), description.trim()]
    );
    return rows[0];
  }

  /**
   * Update room.
   * @param {number} id
   * @param {{ name?, capacity?, location?, description?, is_active? }} fields
   */
  async update(id, fields) {
    const updates = [];
    const params = [];
    let idx = 1;

    const allowed = ['name', 'capacity', 'location', 'description', 'is_active'];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        params.push(fields[key]);
      }
    }
    if (updates.length === 0) return null;

    params.push(id);
    const { rows } = await this.query(
      `UPDATE rooms SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return rows[0] || null;
  }

  /**
   * Search rooms by name or location.
   * @param {string} keyword
   */
  async search(keyword) {
    const term = `%${keyword.trim().toLowerCase()}%`;
    const { rows } = await this.query(
      `SELECT * FROM rooms
       WHERE is_active = true
         AND (LOWER(name) LIKE $1 OR LOWER(location) LIKE $1)
       ORDER BY name ASC`,
      [term]
    );
    return rows;
  }
}

module.exports = new RoomModel();
