-- ============================================================
-- FILE 9: 00009_coshh.sql
-- Table: coshh_assessments
-- ============================================================

CREATE TABLE coshh_assessments (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id               UUID         NOT NULL REFERENCES sites(id),
  product_name          VARCHAR(255) NOT NULL,
  supplier              VARCHAR(255),
  product_reference     VARCHAR(100),
  cas_number            VARCHAR(50),
  location_of_use       TEXT,
  description_of_use    TEXT,
  quantity_used         VARCHAR(100),
  frequency_of_use      VARCHAR(100),
  -- Hazard classification
  is_flammable          BOOLEAN      NOT NULL DEFAULT FALSE,
  is_oxidising          BOOLEAN      NOT NULL DEFAULT FALSE,
  is_toxic              BOOLEAN      NOT NULL DEFAULT FALSE,
  is_corrosive          BOOLEAN      NOT NULL DEFAULT FALSE,
  is_irritant           BOOLEAN      NOT NULL DEFAULT FALSE,
  is_harmful            BOOLEAN      NOT NULL DEFAULT FALSE,
  is_carcinogenic       BOOLEAN      NOT NULL DEFAULT FALSE,
  is_sensitiser         BOOLEAN      NOT NULL DEFAULT FALSE,
  other_hazards         TEXT,
  -- Exposure routes
  exposure_inhalation   BOOLEAN      NOT NULL DEFAULT FALSE,
  exposure_skin         BOOLEAN      NOT NULL DEFAULT FALSE,
  exposure_ingestion    BOOLEAN      NOT NULL DEFAULT FALSE,
  exposure_eyes         BOOLEAN      NOT NULL DEFAULT FALSE,
  -- Controls
  engineering_controls  TEXT,
  ppe_required          TEXT,
  storage_requirements  TEXT,
  disposal_method       TEXT,
  first_aid_measures    TEXT,
  spillage_procedure    TEXT,
  -- SDS / documentation
  sds_file_path         TEXT,        -- relative object storage key only
  sds_file_name         VARCHAR(255),
  sds_issue_date        DATE,
  -- Assessment metadata
  status                VARCHAR(30)  NOT NULL DEFAULT 'Draft'
                                     CHECK (status IN ('Draft', 'Active', 'Under Review', 'Superseded', 'Archived')),
  assessed_by           UUID         NOT NULL REFERENCES users(id),
  assessment_date       DATE         NOT NULL,
  review_due_date       DATE,
  approved_by           UUID         REFERENCES users(id),
  approved_at           TIMESTAMPTZ,
  version               VARCHAR(20)  NOT NULL DEFAULT '1.0',
  superseded_by         UUID         REFERENCES coshh_assessments(id),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit trigger
CREATE TRIGGER audit_coshh_assessments
  AFTER INSERT OR UPDATE OR DELETE ON coshh_assessments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
