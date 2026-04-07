-- ============================================================
-- FILE 29: 00029_password_changed_at.sql
-- Add password_changed_at timestamp to users table
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
