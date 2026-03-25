-- ============================================================
-- FILE 10: 00010_contractors.sql
-- Tables: contractors, contractor_documents
-- ============================================================

CREATE TABLE contractors (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  type_id               UUID         NOT NULL REFERENCES lookup_values(id),
  contact_name          VARCHAR(100),
  contact_email         VARCHAR(255),
  contact_phone         VARCHAR(30),
  address               TEXT,
  postcode              VARCHAR(10),
  is_approved           BOOLEAN      NOT NULL DEFAULT FALSE,
  approved_by           UUID         REFERENCES users(id),
  approved_at           TIMESTAMPTZ,
  notes                 TEXT,
  is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE contractor_documents (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id    UUID         NOT NULL REFERENCES contractors(id),
  type_id          UUID         NOT NULL REFERENCES lookup_values(id),
  title            VARCHAR(255) NOT NULL,
  file_path        TEXT,        -- relative object storage key only
  file_name        VARCHAR(255),
  file_size_bytes  BIGINT,
  mime_type        VARCHAR(100),
  issue_date       DATE,
  expiry_date      DATE,
  notes            TEXT,
  uploaded_by      UUID         NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit triggers
CREATE TRIGGER audit_contractors
  AFTER INSERT OR UPDATE OR DELETE ON contractors
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_contractor_documents
  AFTER INSERT OR UPDATE OR DELETE ON contractor_documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
