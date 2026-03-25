-- ============================================================
-- FILE 1: 00001_foundation.sql
-- Tables: sites, lookup_categories, lookup_values,
--         system_settings, roles
-- ============================================================

-- sites
CREATE TABLE sites (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  address    TEXT,
  postcode   VARCHAR(10),
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- lookup_categories
CREATE TABLE lookup_categories (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(100) NOT NULL UNIQUE,
  label       VARCHAR(100) NOT NULL,
  description TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE
);

-- lookup_values
CREATE TABLE lookup_values (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID         NOT NULL REFERENCES lookup_categories(id),
  value       VARCHAR(200) NOT NULL,
  label       VARCHAR(200) NOT NULL,
  sort_order  SMALLINT     NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- system_settings
CREATE TABLE system_settings (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(100) NOT NULL UNIQUE,
  value       TEXT         NOT NULL,
  data_type   VARCHAR(20)  NOT NULL CHECK (data_type IN ('integer', 'boolean', 'string')),
  label       VARCHAR(100) NOT NULL,
  description TEXT,
  updated_by  UUID,        -- FK to users added after users table created
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- roles
CREATE TABLE roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  sort_order  SMALLINT    NOT NULL DEFAULT 0
);
