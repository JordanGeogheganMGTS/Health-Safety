-- ============================================================
-- FILE 2: 00002_users.sql
-- Tables: users, user_permission_overrides
-- ============================================================

CREATE TABLE users (
  id                    UUID         PRIMARY KEY,  -- matches Supabase Auth user ID exactly
  email                 VARCHAR(255) NOT NULL UNIQUE,
  first_name            VARCHAR(100) NOT NULL,
  last_name             VARCHAR(100) NOT NULL,
  role_id               UUID         NOT NULL REFERENCES roles(id),
  site_id               UUID         REFERENCES sites(id),
  is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
  dse_not_applicable    BOOLEAN      NOT NULL DEFAULT FALSE,
  dse_last_assessment_id UUID,                    -- FK added later after dse_assessments created
  ppe_notes             TEXT,
  deactivated_at        TIMESTAMPTZ,
  deactivated_by        UUID         REFERENCES users(id),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_login_at         TIMESTAMPTZ
);

-- Add FK on system_settings.updated_by now that users exists
ALTER TABLE system_settings
  ADD CONSTRAINT system_settings_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES users(id);

CREATE TABLE user_permission_overrides (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id),
  module_key   VARCHAR(100) NOT NULL,
  access_level VARCHAR(20)  NOT NULL CHECK (access_level IN ('view', 'limited', 'full')),
  granted_by   UUID         NOT NULL REFERENCES users(id),
  granted_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  notes        TEXT
);
