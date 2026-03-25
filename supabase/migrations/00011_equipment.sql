-- ============================================================
-- FILE 11: 00011_equipment.sql
-- Tables: equipment, equipment_service_records
-- ============================================================

CREATE TABLE equipment (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id               UUID         NOT NULL REFERENCES sites(id),
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  category_id           UUID         NOT NULL REFERENCES lookup_values(id),
  status_id             UUID         NOT NULL REFERENCES lookup_values(id),
  manufacturer          VARCHAR(100),
  model                 VARCHAR(100),
  serial_number         VARCHAR(100),
  asset_tag             VARCHAR(100),
  purchase_date         DATE,
  installation_date     DATE,
  next_inspection_date  DATE,
  location              VARCHAR(255),
  responsible_person    UUID         REFERENCES users(id),
  notes                 TEXT,
  is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE equipment_service_records (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id     UUID         NOT NULL REFERENCES equipment(id),
  type_id          UUID         NOT NULL REFERENCES lookup_values(id),
  service_date     DATE         NOT NULL,
  performed_by     VARCHAR(255),            -- may be external contractor (free text)
  contractor_id    UUID         REFERENCES contractors(id),
  outcome_id       UUID         NOT NULL REFERENCES lookup_values(id),
  notes            TEXT,
  next_due_date    DATE,
  file_path        TEXT,        -- relative object storage key for certificate/report
  file_name        VARCHAR(255),
  file_size_bytes  BIGINT,
  mime_type        VARCHAR(100),
  recorded_by      UUID         NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit triggers
CREATE TRIGGER audit_equipment
  AFTER INSERT OR UPDATE OR DELETE ON equipment
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_equipment_service_records
  AFTER INSERT OR UPDATE OR DELETE ON equipment_service_records
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
