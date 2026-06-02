-- StudyPod Scheduler Database Schema
-- Run this file once against your Neon PostgreSQL database to set up all tables.

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'student'
                CHECK (role IN ('student', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rooms / study pods table
CREATE TABLE IF NOT EXISTS rooms (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  capacity    INT NOT NULL CHECK (capacity > 0),
  location    VARCHAR(150),
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id     INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  purpose     VARCHAR(255),
  status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_end_before_start CHECK (end_time > start_time)
);

-- Index for fast conflict checking
CREATE INDEX IF NOT EXISTS idx_reservations_room_time
  ON reservations (room_id, start_time, end_time)
  WHERE status = 'active';

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_reservations_user
  ON reservations (user_id);

-- Seed one default admin account (password: Admin@1234)
-- bcrypt hash of 'Admin@1234' with 12 rounds
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Library Admin',
  'admin@studypod.local',
  '$2a$12$A8NkGlbTb3W7fBZ3z7EoaOJmHNzgR8GwKtVeP5IEsL1T1hW1wNJEi',
  'admin'
) ON CONFLICT (email) DO NOTHING;
