'use strict';

const express = require('express');
const router = express.Router();

const UserModel = require('../models/UserModel');
const { signToken, requireAuth } = require('../middleware/auth');
const { sanitizeString } = require('../middleware/validation');

/**
 * POST /api/auth/register
 * Create a new student account.
 */
router.post('/register', async (req, res) => {
  try {
    const name     = sanitizeString(req.body.name);
    const email    = sanitizeString(req.body.email);
    const password = req.body.password || '';

    const { valid, errors } = UserModel.validate({ name, email, password });
    if (!valid) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user  = await UserModel.create({ name, email, password });
    const token = signToken(user);

    return res.status(201).json({ token, user: UserModel.toPublic(user) });
  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate with email + password and receive a JWT.
 */
router.post('/login', async (req, res) => {
  try {
    const email    = sanitizeString(req.body.email);
    const password = req.body.password || '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await UserModel.verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    return res.json({ token, user: UserModel.toPublic(user) });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: UserModel.toPublic(user) });
  } catch (err) {
    console.error('Me error:', err.message);
    return res.status(500).json({ error: 'Could not retrieve user.' });
  }
});

module.exports = router;
