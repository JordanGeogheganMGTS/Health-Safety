-- ============================================================
-- FILE 8: 00008_method_statements.sql
-- Tables: method_statements, method_statement_steps
-- ============================================================

CREATE TABLE method_statements (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          UUID         NOT NULL REFERENCES sites(id),
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  category_id      UUID         NOT NULL REFERENCES lookup_values(id),
  status           VARCHAR(30)  NOT NULL DEFAULT 'Draft'
                                CHECK (status IN ('Draft', 'Active', 'Under Review', 'Superseded', 'Archived')),
  scope_of_work    TEXT,
  plant_equipment  TEXT,        -- plant and equipment to be used
  substances       TEXT,        -- substances / materials involved
  ppe_required     TEXT,        -- free-text summary of PPE required
  emergency_procedures TEXT,
  authored_by      UUID         NOT NULL REFERENCES users(id),
  authored_date    DATE         NOT NULL,
  approved_by      UUID         REFERENCES users(id),
  approved_at      TIMESTAMPTZ,
  review_due_date  DATE,
  version          VARCHAR(20)  NOT NULL DEFAULT '1.0',
  superseded_by    UUID         REFERENCES method_statements(id),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Ordered sequence of work steps
CREATE TABLE method_statement_steps (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  method_statement_id   UUID         NOT NULL REFERENCES method_statements(id),
  step_number           SMALLINT     NOT NULL,
  title                 VARCHAR(255) NOT NULL,
  description           TEXT         NOT NULL,
  hazards               TEXT,
  control_measures      TEXT,
  responsible_role      VARCHAR(100),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (method_statement_id, step_number)
);

-- Audit triggers
CREATE TRIGGER audit_method_statements
  AFTER INSERT OR UPDATE OR DELETE ON method_statements
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_method_statement_steps
  AFTER INSERT OR UPDATE OR DELETE ON method_statement_steps
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
