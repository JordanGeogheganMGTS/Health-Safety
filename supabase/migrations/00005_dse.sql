-- ============================================================
-- FILE 5: 00005_dse.sql
-- Tables: dse_assessments, dse_assessment_responses
-- ============================================================

-- dse_assessments: one per user per assessment cycle
CREATE TABLE dse_assessments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(id),
  site_id          UUID        NOT NULL REFERENCES sites(id),
  assessed_by      UUID        NOT NULL REFERENCES users(id),
  assessment_date  DATE        NOT NULL,
  status           VARCHAR(30) NOT NULL DEFAULT 'Draft'
                               CHECK (status IN ('Draft', 'Submitted', 'Reviewed', 'Closed')),
  overall_notes    TEXT,
  next_review_date DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wire up the deferred FK on users.dse_last_assessment_id now that dse_assessments exists
ALTER TABLE users
  ADD CONSTRAINT users_dse_last_assessment_id_fkey
  FOREIGN KEY (dse_last_assessment_id) REFERENCES dse_assessments(id);

-- dse_assessment_responses: one row per question per assessment
CREATE TABLE dse_assessment_responses (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id        UUID        NOT NULL REFERENCES dse_assessments(id),
  item_key             VARCHAR(100) NOT NULL,    -- matches dse_question_templates.item_key
  response             VARCHAR(10) NOT NULL
                                   CHECK (response IN ('yes', 'no', 'n/a')),
  notes                TEXT,
  ca_id                UUID,                     -- FK to corrective_actions added in 00015_corrective_actions.sql
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit triggers
CREATE TRIGGER audit_dse_assessments
  AFTER INSERT OR UPDATE OR DELETE ON dse_assessments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_dse_assessment_responses
  AFTER INSERT OR UPDATE OR DELETE ON dse_assessment_responses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
