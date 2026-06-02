'use strict';

const pool = require('../db/pool');

/**
 * BaseModel provides common database interaction methods for all entity models.
 * Concrete subclasses inherit these methods and may override them (polymorphism).
 * All SQL uses parameterized queries to prevent SQL injection (encapsulation of DB logic).
 */
class BaseModel {
  constructor(tableName) {
    if (!tableName) throw new Error('BaseModel requires a table name.');
    this.table = tableName;
    this.pool = pool;
  }

  /**
   * Run a raw parameterized query.
   * @param {string} sql
   * @param {Array} params
   */
  async query(sql, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Find a single row by primary key.
   * @param {number} id
   */
  async findById(id) {
    const { rows } = await this.query(
      `SELECT * FROM ${this.table} WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Return all rows, optionally filtered by a WHERE clause.
   * @param {string} whereClause  e.g. "is_active = $1"
   * @param {Array}  params
   * @param {string} orderBy      e.g. "created_at DESC"
   */
  async findAll(whereClause = '', params = [], orderBy = 'id ASC') {
    const where = whereClause ? `WHERE ${whereClause}` : '';
    const { rows } = await this.query(
      `SELECT * FROM ${this.table} ${where} ORDER BY ${orderBy}`,
      params
    );
    return rows;
  }

  /**
   * Delete a row by primary key. Returns the deleted row.
   * @param {number} id
   */
  async deleteById(id) {
    const { rows } = await this.query(
      `DELETE FROM ${this.table} WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Validate entity data. Subclasses should override this method (polymorphism).
   * @param {Object} data
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(data) {
    return { valid: true, errors: [] };
  }
}

module.exports = BaseModel;
