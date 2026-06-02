'use strict';

/**
 * Sanitize a string value:
 * - Trims leading/trailing whitespace
 * - Strips characters that are unsafe in plain-text contexts
 * @param {string} value
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/<[^>]*>/g, '');
}

/**
 * Express middleware factory — validates that all listed fields exist
 * in req.body and are non-empty strings after sanitization.
 * @param {string[]} fields
 */
function requireFields(fields) {
  return (req, res, next) => {
    const missing = [];
    for (const field of fields) {
      const val = req.body[field];
      if (val === undefined || val === null || String(val).trim() === '') {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(', ')}.`
      });
    }
    next();
  };
}

/**
 * Validate that a value is a positive integer.
 * @param {*} value
 */
function isPositiveInt(value) {
  const n = parseInt(value, 10);
  return !isNaN(n) && n > 0;
}

/**
 * Validate ISO datetime string.
 * @param {string} value
 */
function isValidDate(value) {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

module.exports = { sanitizeString, requireFields, isPositiveInt, isValidDate };
