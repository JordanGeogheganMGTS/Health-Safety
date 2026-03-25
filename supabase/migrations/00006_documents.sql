-- ============================================================
-- FILE 6: 00006_documents.sql
-- Table: documents
-- ============================================================

-- status is a fixed workflow state, not a configurable lookup
CREATE TABLE documents (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          UUID         REFERENCES sites(id),          -- NULL = organisation-wide
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  category_id      UUID         NOT NULL REFERENCES lookup_values(id),
  status           VARCHAR(30)  NOT NULL DEFAULT 'Draft'
                                CHECK (status IN ('Draft', 'Current', 'Under Review', 'Superseded', 'Expired')),
  version          VARCHAR(20)  NOT NULL DEFAULT '1.0',
  file_path        TEXT,                                        -- relative object storage key only
  file_name        VARCHAR(255),
  file_size_bytes  BIGINT,
  mime_type        VARCHAR(100),
  owner_id         UUID         NOT NULL REFERENCES users(id),
  approved_by      UUID         REFERENCES users(id),
  approved_at      TIMESTAMPTZ,
  review_due_date  DATE,
  superseded_by    UUID         REFERENCES documents(id),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit trigger
CREATE TRIGGER audit_documents
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
