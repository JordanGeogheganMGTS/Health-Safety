-- ============================================================
-- FILE 13: 00013_inspections.sql
-- Tables: inspection_templates, inspection_template_items,
--         inspections, inspection_findings
-- ============================================================

-- inspection_templates: reusable checklist templates
CREATE TABLE inspection_templates (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  type_id       UUID         NOT NULL REFERENCES lookup_values(id),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by    UUID         NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- inspection_template_items: individual checklist items within a template
-- response_type is a fixed set of UI control types, not a configurable lookup
CREATE TABLE inspection_template_items (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID         NOT NULL REFERENCES inspection_templates(id),
  section         VARCHAR(100),
  item_text       TEXT         NOT NULL,
  response_type   VARCHAR(20)  NOT NULL DEFAULT 'yes_no'
                               CHECK (response_type IN ('yes_no', 'yes_no_na', 'text', 'numeric', 'pass_fail')),
  is_required     BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order      SMALLINT     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- inspections: a completed or in-progress inspection
CREATE TABLE inspections (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id              UUID         NOT NULL REFERENCES sites(id),
  template_id          UUID         REFERENCES inspection_templates(id),
  type_id              UUID         NOT NULL REFERENCES lookup_values(id),
  title                VARCHAR(255) NOT NULL,
  inspection_date      DATE         NOT NULL,
  inspected_by         UUID         NOT NULL REFERENCES users(id),
  status               VARCHAR(30)  NOT NULL DEFAULT 'Draft'
                                    CHECK (status IN ('Draft', 'Submitted', 'Closed')),
  overall_outcome_id   UUID         REFERENCES lookup_values(id),
  summary_notes        TEXT,
  next_inspection_date DATE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- inspection_findings: individual findings / non-conformances raised during an inspection
CREATE TABLE inspection_findings (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id    UUID         NOT NULL REFERENCES inspections(id),
  template_item_id UUID         REFERENCES inspection_template_items(id),
  description      TEXT         NOT NULL,
  severity_id      UUID         NOT NULL REFERENCES lookup_values(id),
  response         VARCHAR(10)  CHECK (response IN ('yes', 'no', 'n/a', 'pass', 'fail')),
  response_text    TEXT,
  response_numeric NUMERIC,
  photo_path       TEXT,        -- relative object storage key only
  ca_id            UUID,        -- FK to corrective_actions added in 00015_corrective_actions.sql
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit triggers
CREATE TRIGGER audit_inspection_templates
  AFTER INSERT OR UPDATE OR DELETE ON inspection_templates
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_inspection_template_items
  AFTER INSERT OR UPDATE OR DELETE ON inspection_template_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_inspections
  AFTER INSERT OR UPDATE OR DELETE ON inspections
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_inspection_findings
  AFTER INSERT OR UPDATE OR DELETE ON inspection_findings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
