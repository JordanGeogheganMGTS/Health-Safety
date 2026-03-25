-- ============================================================
-- FILE 7: 00007_risk_assessments.sql
-- Tables: risk_assessments, ra_hazards
-- ============================================================

-- status is a fixed workflow state; overall_rating is app-calculated
CREATE TABLE risk_assessments (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          UUID         NOT NULL REFERENCES sites(id),
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  category_id      UUID         NOT NULL REFERENCES lookup_values(id),
  status           VARCHAR(30)  NOT NULL DEFAULT 'Draft'
                                CHECK (status IN ('Draft', 'Active', 'Under Review', 'Superseded', 'Archived')),
  overall_rating   VARCHAR(20)  CHECK (overall_rating IN ('Low', 'Medium', 'High', 'Very High')),
  assessed_by      UUID         NOT NULL REFERENCES users(id),
  assessment_date  DATE         NOT NULL,
  review_due_date  DATE,
  approved_by      UUID         REFERENCES users(id),
  approved_at      TIMESTAMPTZ,
  version          VARCHAR(20)  NOT NULL DEFAULT '1.0',
  superseded_by    UUID         REFERENCES risk_assessments(id),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Individual hazards within a risk assessment
CREATE TABLE ra_hazards (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_assessment_id    UUID         NOT NULL REFERENCES risk_assessments(id),
  hazard_description    TEXT         NOT NULL,
  who_is_affected       TEXT,
  existing_controls     TEXT,
  likelihood_before     SMALLINT     NOT NULL CHECK (likelihood_before BETWEEN 1 AND 5),
  severity_before       SMALLINT     NOT NULL CHECK (severity_before BETWEEN 1 AND 5),
  risk_rating_before    SMALLINT     GENERATED ALWAYS AS (likelihood_before * severity_before) STORED,
  additional_controls   TEXT,
  likelihood_after      SMALLINT     CHECK (likelihood_after BETWEEN 1 AND 5),
  severity_after        SMALLINT     CHECK (severity_after BETWEEN 1 AND 5),
  risk_rating_after     SMALLINT     GENERATED ALWAYS AS (
                          CASE WHEN likelihood_after IS NOT NULL AND severity_after IS NOT NULL
                               THEN likelihood_after * severity_after
                               ELSE NULL
                          END
                        ) STORED,
  responsible_person    UUID         REFERENCES users(id),
  action_due_date       DATE,
  sort_order            SMALLINT     NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit triggers
CREATE TRIGGER audit_risk_assessments
  AFTER INSERT OR UPDATE OR DELETE ON risk_assessments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_ra_hazards
  AFTER INSERT OR UPDATE OR DELETE ON ra_hazards
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
