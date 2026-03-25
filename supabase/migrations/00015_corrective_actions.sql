-- ============================================================
-- FILE 15: 00015_corrective_actions.sql
-- Table: corrective_actions
-- Then add all deferred FK constraints for ca_id columns
-- ============================================================

CREATE TABLE corrective_actions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          UUID         NOT NULL REFERENCES sites(id),
  title            VARCHAR(255) NOT NULL,
  description      TEXT         NOT NULL,
  priority_id      UUID         NOT NULL REFERENCES lookup_values(id),
  status           VARCHAR(30)  NOT NULL DEFAULT 'Open'
                                CHECK (status IN ('Open', 'In Progress', 'Completed', 'Verified', 'Overdue', 'Cancelled')),
  -- Source linkage (only one should be populated)
  source_table     VARCHAR(100),           -- name of the originating table
  source_record_id UUID,                   -- PK of the originating record
  -- Assignment
  assigned_to      UUID         NOT NULL REFERENCES users(id),
  assigned_by      UUID         NOT NULL REFERENCES users(id),
  due_date         DATE         NOT NULL,
  -- Completion
  completed_by     UUID         REFERENCES users(id),
  completed_at     TIMESTAMPTZ,
  completion_notes TEXT,
  -- Verification
  verified_by      UUID         REFERENCES users(id),
  verified_at      TIMESTAMPTZ,
  verification_notes TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit trigger
CREATE TRIGGER audit_corrective_actions
  AFTER INSERT OR UPDATE OR DELETE ON corrective_actions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ---------------------------------------------------------------
-- Now wire up the deferred FK constraints for ca_id columns
-- that were left NULL in earlier migrations
-- ---------------------------------------------------------------

-- dse_assessment_responses.ca_id
ALTER TABLE dse_assessment_responses
  ADD CONSTRAINT dse_assessment_responses_ca_id_fkey
  FOREIGN KEY (ca_id) REFERENCES corrective_actions(id);

-- fire_alarm_tests.ca_id
ALTER TABLE fire_alarm_tests
  ADD CONSTRAINT fire_alarm_tests_ca_id_fkey
  FOREIGN KEY (ca_id) REFERENCES corrective_actions(id);

-- fire_drills.ca_id
ALTER TABLE fire_drills
  ADD CONSTRAINT fire_drills_ca_id_fkey
  FOREIGN KEY (ca_id) REFERENCES corrective_actions(id);

-- inspection_findings.ca_id
ALTER TABLE inspection_findings
  ADD CONSTRAINT inspection_findings_ca_id_fkey
  FOREIGN KEY (ca_id) REFERENCES corrective_actions(id);
