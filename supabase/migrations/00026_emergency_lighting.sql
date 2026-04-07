-- ============================================================
-- FILE 26: 00026_emergency_lighting.sql
-- Tables: emergency_lights, emergency_light_tests,
--         emergency_light_test_results
-- ============================================================

-- Register of individual light fittings per site
CREATE TABLE emergency_lights (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         UUID         NOT NULL REFERENCES sites(id),
  identifier      VARCHAR(100) NOT NULL,   -- e.g. "EL-01", "Exit Sign - Front Door"
  location        VARCHAR(255),            -- e.g. "Ground floor corridor"
  fitting_type    VARCHAR(100),            -- e.g. "Exit Sign", "Bulkhead", "Downlight"
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- A test session (covers one site on one date)
CREATE TABLE emergency_light_tests (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         UUID         NOT NULL REFERENCES sites(id),
  test_date       DATE         NOT NULL,
  test_type       VARCHAR(30)  NOT NULL
                               CHECK (test_type IN ('Monthly Functional', 'Annual Duration')),
  tested_by       UUID         NOT NULL REFERENCES users(id),
  overall_result  VARCHAR(10)  CHECK (overall_result IN ('Pass', 'Fail')),
  notes           TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- One row per light per test
CREATE TABLE emergency_light_test_results (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id           UUID        NOT NULL REFERENCES emergency_light_tests(id) ON DELETE CASCADE,
  light_id          UUID        NOT NULL REFERENCES emergency_lights(id),
  result            VARCHAR(10) NOT NULL CHECK (result IN ('Pass', 'Fail', 'N/A')),
  defects           TEXT,
  corrective_action TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Audit triggers ───────────────────────────────────────────────────────────

CREATE TRIGGER audit_emergency_lights
  AFTER INSERT OR UPDATE OR DELETE ON emergency_lights
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_emergency_light_tests
  AFTER INSERT OR UPDATE OR DELETE ON emergency_light_tests
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ─── RLS Policies ─────────────────────────────────────────────────────────────

ALTER TABLE emergency_lights ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_light_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_light_test_results ENABLE ROW LEVEL SECURITY;

-- emergency_lights: admins/managers see all; others see their site
CREATE POLICY emergency_lights_select ON emergency_lights
  FOR SELECT USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR site_id = auth_site_id()
  );
CREATE POLICY emergency_lights_insert ON emergency_lights
  FOR INSERT WITH CHECK (auth_role() IN ('System Admin', 'H&S Manager'));
CREATE POLICY emergency_lights_update ON emergency_lights
  FOR UPDATE USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- emergency_light_tests
CREATE POLICY emergency_light_tests_select ON emergency_light_tests
  FOR SELECT USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR site_id = auth_site_id()
  );
CREATE POLICY emergency_light_tests_insert ON emergency_light_tests
  FOR INSERT WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR site_id = auth_site_id()
  );
CREATE POLICY emergency_light_tests_update ON emergency_light_tests
  FOR UPDATE USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- emergency_light_test_results
CREATE POLICY emergency_light_test_results_select ON emergency_light_test_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM emergency_light_tests t
      WHERE t.id = test_id
        AND (auth_role() IN ('System Admin', 'H&S Manager') OR t.site_id = auth_site_id())
    )
  );
CREATE POLICY emergency_light_test_results_insert ON emergency_light_test_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM emergency_light_tests t
      WHERE t.id = test_id
        AND (auth_role() IN ('System Admin', 'H&S Manager') OR t.site_id = auth_site_id())
    )
  );
CREATE POLICY emergency_light_test_results_update ON emergency_light_test_results
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM emergency_light_tests t
      WHERE t.id = test_id
        AND auth_role() IN ('System Admin', 'H&S Manager')
    )
  );
