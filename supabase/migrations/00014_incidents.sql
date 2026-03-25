-- ============================================================
-- FILE 14: 00014_incidents.sql
-- Table: incidents
-- ============================================================

CREATE TABLE incidents (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id               UUID         NOT NULL REFERENCES sites(id),
  type_id               UUID         NOT NULL REFERENCES lookup_values(id),
  title                 VARCHAR(255) NOT NULL,
  description           TEXT         NOT NULL,
  incident_date         DATE         NOT NULL,
  incident_time         TIME,
  location              VARCHAR(255),
  -- Persons involved
  injured_person_name   VARCHAR(100),
  injured_person_type   VARCHAR(50)  CHECK (injured_person_type IN ('Employee', 'Contractor', 'Visitor', 'Member of Public', 'Other')),
  injured_person_dept   VARCHAR(100),
  -- Injury / illness details
  injury_description    TEXT,
  body_part_affected    VARCHAR(100),
  treatment_given       TEXT,
  treatment_location    VARCHAR(100),
  taken_to_hospital     BOOLEAN      NOT NULL DEFAULT FALSE,
  -- RIDDOR
  is_riddor_reportable  BOOLEAN      NOT NULL DEFAULT FALSE,
  riddor_report_date    DATE,
  riddor_reference      VARCHAR(50),
  -- Investigation
  immediate_causes      TEXT,
  root_causes           TEXT,
  witnesses             TEXT,
  -- Status
  status                VARCHAR(30)  NOT NULL DEFAULT 'Open'
                                     CHECK (status IN ('Open', 'Under Investigation', 'Closed', 'Referred')),
  reported_by           UUID         NOT NULL REFERENCES users(id),
  investigated_by       UUID         REFERENCES users(id),
  closed_by             UUID         REFERENCES users(id),
  closed_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit trigger
CREATE TRIGGER audit_incidents
  AFTER INSERT OR UPDATE OR DELETE ON incidents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
