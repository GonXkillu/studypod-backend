'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const authRoutes        = require('./routes/auth');
const roomRoutes        = require('./routes/rooms');
const reservationRoutes = require('./routes/reservations');
const adminRoutes       = require('./routes/admin');
const reportRoutes      = require('./routes/reports');

const app = express();

const rawOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['*'];
const allowAll = rawOrigins.includes('*');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowAll) return callback(null, true);
    if (rawOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed.`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '50kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',         authRoutes);
app.use('/api/rooms',        roomRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/reports',      reportRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`StudyPod API running on port ${PORT}`);
  });
}

module.exports = app;
