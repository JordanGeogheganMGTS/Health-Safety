-- ============================================================
-- FILE 12: 00012_fire_safety.sql
-- Tables: fire_extinguishers, fire_extinguisher_inspections,
--         fire_alarm_systems, fire_alarm_tests, fire_drills
-- ============================================================

-- fire_extinguishers
CREATE TABLE fire_extinguishers (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id              UUID         NOT NULL REFERENCES sites(id),
  type_id              UUID         NOT NULL REFERENCES lookup_values(id),
  location             VARCHAR(255) NOT NULL,
  serial_number        VARCHAR(100),
  manufacture_date     DATE,
  last_inspection_date DATE,
  next_inspection_date DATE,
  status_id            UUID         NOT NULL REFERENCES lookup_values(id),
  notes                TEXT,
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- fire_extinguisher_inspections
CREATE TABLE fire_extinguisher_inspections (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  fire_extinguisher_id UUID         NOT NULL REFERENCES fire_extinguishers(id),
  inspection_date      DATE         NOT NULL,
  inspected_by         VARCHAR(255),         -- may be external engineer (free text)
  contractor_id        UUID         REFERENCES contractors(id),
  outcome_id           UUID         NOT NULL REFERENCES lookup_values(id),
  pressure_ok          BOOLEAN,
  weight_ok            BOOLEAN,
  pin_intact           BOOLEAN,
  label_legible        BOOLEAN,
  no_physical_damage   BOOLEAN,
  notes                TEXT,
  next_due_date        DATE,
  file_path            TEXT,        -- relative object storage key
  file_name            VARCHAR(255),
  recorded_by          UUID         NOT NULL REFERENCES users(id),
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- fire_alarm_systems
CREATE TABLE fire_alarm_systems (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         UUID         NOT NULL REFERENCES sites(id),
  panel_location  VARCHAR(255),
  manufacturer    VARCHAR(100),
  model           VARCHAR(100),
  serial_number   VARCHAR(100),
  installation_date DATE,
  last_service_date DATE,
  next_service_date DATE,
  notes           TEXT,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- fire_alarm_tests
CREATE TABLE fire_alarm_tests (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  fire_alarm_system_id  UUID         NOT NULL REFERENCES fire_alarm_systems(id),
  test_type_id          UUID         NOT NULL REFERENCES lookup_values(id),
  test_date             DATE         NOT NULL,
  test_time             TIME,
  tested_by             UUID         NOT NULL REFERENCES users(id),
  contractor_id         UUID         REFERENCES contractors(id),
  call_point_tested     VARCHAR(100),
  outcome_id            UUID         NOT NULL REFERENCES lookup_values(id),
  fault_description     TEXT,
  remedial_action       TEXT,
  ca_id                 UUID,        -- FK to corrective_actions added in 00015_corrective_actions.sql
  notes                 TEXT,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- fire_drills
CREATE TABLE fire_drills (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id               UUID         NOT NULL REFERENCES sites(id),
  drill_date            DATE         NOT NULL,
  drill_time            TIME,
  coordinated_by        UUID         NOT NULL REFERENCES users(id),
  evacuation_time_secs  INTEGER,
  number_evacuated      INTEGER,
  issues_identified     TEXT,
  ca_id                 UUID,        -- FK to corrective_actions added in 00015_corrective_actions.sql
  notes                 TEXT,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Audit triggers
CREATE TRIGGER audit_fire_extinguishers
  AFTER INSERT OR UPDATE OR DELETE ON fire_extinguishers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_fire_extinguisher_inspections
  AFTER INSERT OR UPDATE OR DELETE ON fire_extinguisher_inspections
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_fire_alarm_systems
  AFTER INSERT OR UPDATE OR DELETE ON fire_alarm_systems
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_fire_alarm_tests
  AFTER INSERT OR UPDATE OR DELETE ON fire_alarm_tests
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_fire_drills
  AFTER INSERT OR UPDATE OR DELETE ON fire_drills
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
