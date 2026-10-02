-- ============================================================
-- AI Appointment Booking Assistant — PostgreSQL DDL
-- Database : appointment_ai
-- Note     : Prisma is the source of truth for migrations.
--            This file is the raw SQL reference / documentation.
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

-- ── Enums ─────────────────────────────────────────────────────

CREATE TYPE "AppointmentStatus" AS ENUM (
  'SCHEDULED',
  'CANCELLED',
  'COMPLETED'
);

CREATE TYPE "MessageRole" AS ENUM (
  'USER',
  'ASSISTANT',
  'SYSTEM'
);

-- ── Tables ────────────────────────────────────────────────────

-- users
CREATE TABLE IF NOT EXISTS users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_unique UNIQUE (email)
);

-- appointments
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID                NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID                NOT NULL,
  appointment_date DATE                NOT NULL,
  appointment_time VARCHAR(10)         NOT NULL,
  reason           TEXT                NOT NULL,
  status           "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
  created_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

  CONSTRAINT appointments_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
);

-- chat_sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id         UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL,
  title      VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chat_sessions_user_fk
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
);

-- chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID          NOT NULL,
  role       "MessageRole" NOT NULL,
  content    TEXT          NOT NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT chat_messages_content_not_empty
    CHECK (content <> ''),

  CONSTRAINT chat_messages_session_fk
    FOREIGN KEY (session_id) REFERENCES chat_sessions (id)
    ON DELETE CASCADE
);

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email
  ON users (email);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id
  ON appointments (user_id);

CREATE INDEX IF NOT EXISTS idx_appointments_date
  ON appointments (appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON appointments (status);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
  ON chat_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
  ON chat_messages (session_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
  ON chat_messages (created_at);

-- ── Auto-update updated_at trigger ───────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
