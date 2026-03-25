-- ============================================================
-- FILE 16: 00016_training.sql
-- Tables: training_types, training_records
-- ============================================================

-- training_types: catalogue of training courses / certifications
CREATE TABLE training_types (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  provider              VARCHAR(255),
  validity_months       SMALLINT,    -- NULL = does not expire
  is_mandatory          BOOLEAN      NOT NULL DEFAULT FALSE,
  applies_to_all_sites  BOOLEAN      NOT NULL DEFAULT TRUE,
  is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- training_records: individual training completions per user
CREATE TABLE training_records (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID         NOT NULL REFERENCES users(id),
  site_id               UUID         NOT NULL REFERENCES sites(id),
  training_type_id      UUID         NOT NULL REFERENCES training_types(id),
  completion_date       DATE         NOT NULL,
  expiry_date           DATE,        -- calculated by app from completion_date + validity_months, or manually set
  provider              VARCHAR(255),
  trainer_name          VARCHAR(100),
  result                VARCHAR(20)  CHECK (result IN ('Pass', 'Fail', 'Attended', 'Incomplete')),
  certificate_file_path TEXT,        -- relative object storage key only
  certificate_file_name VARCHAR(255),
  certificate_file_size BIGINT,
  mime_type             VARCHAR(100),
  notes                 TEXT,
  recorded_by           UUID         NOT NULL REFERENCES users(id),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit triggers
CREATE TRIGGER audit_training_types
  AFTER INSERT OR UPDATE OR DELETE ON training_types
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_training_records
  AFTER INSERT OR UPDATE OR DELETE ON training_records
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
