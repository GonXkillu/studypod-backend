'use strict';

const bcrypt = require('bcryptjs');
const BaseModel = require('./BaseModel');

/**
 * UserModel inherits from BaseModel .
 * Adds user specific logic: registration, login, and credential validation.
 */
class UserModel extends BaseModel {
  constructor() {
    super('users');
    this.SALT_ROUNDS = 12;
  }

  /**
   * Polymorphic override of BaseModel.validate().
   * Enforces user-specific field rules.
   */
  validate(data) {
    const errors = [];
    const { name, email, password } = data;

    if (!name || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      errors.push('A valid email address is required.');
    }

    if (password !== undefined) {
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters.');
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter.');
      }
      if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number.');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Find a user by email address.
   * @param {string} email
   */
  async findByEmail(email) {
    const { rows } = await this.query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email.toLowerCase().trim()]
    );
    return rows[0] || null;
  }

  /**
   * Create a new user. Password is hashed before storage.
   * @param {{ name, email, password, role }} data
   */
  async create({ name, email, password, role = 'student' }) {
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
    const { rows } = await this.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, role]
    );
    return rows[0];
  }

  /**
   * Verify a plain-text password against a stored bcrypt hash.
   * @param {string} plain
   * @param {string} hash
   */
  async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  }

  /**
   * Return the public representation of a user (no password hash).
   * @param {Object} user
   */
  toPublic(user) {
    const { password_hash, ...safe } = user;
    return safe;
  }

  /**
   * Update a user's name or role by id.
   * @param {number} id
   * @param {{ name?, role? }} fields
   */
  async update(id, fields) {
    const updates = [];
    const params = [];
    let idx = 1;

    if (fields.name) {
      updates.push(`name = $${idx++}`);
      params.push(fields.name.trim());
    }
    if (fields.role) {
      updates.push(`role = $${idx++}`);
      params.push(fields.role);
    }
    if (updates.length === 0) return null;

    params.push(id);
    const { rows } = await this.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, role, created_at`,
      params
    );
    return rows[0] || null;
  }
}

module.exports = new UserModel();
