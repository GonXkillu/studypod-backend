'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Generate a signed JWT for a user.
 * @param {{ id, email, role }} user
 */
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

/**
 * Express middleware — verifies the Authorization Bearer token.
 * Attaches the decoded payload to req.user on success.
 */
function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Express middleware — allows only users with the 'admin' role.
 * Must be used after requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required.' });
  }
  next();
}

module.exports = { signToken, requireAuth, requireAdmin };
