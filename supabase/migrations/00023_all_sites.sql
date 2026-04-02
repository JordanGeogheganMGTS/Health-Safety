-- ============================================================
-- Migration 00023: "All Sites" concept
--
-- Adds a special "All Sites" site record. Content tagged with
-- this site is visible to ALL authenticated users. Users assigned
-- to this site can view records from every site.
--
-- Read-Only access is now purely site-based — no role-level
-- override grants cross-site visibility.
-- ============================================================

-- 1. Flag on sites table
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS is_all_sites BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. The "All Sites" site record
INSERT INTO sites (name, is_all_sites)
VALUES ('All Sites', TRUE)
ON CONFLICT DO NOTHING;

-- 3. Helper: UUID of the "All Sites" site
CREATE OR REPLACE FUNCTION all_sites_id() RETURNS UUID AS $$
  SELECT id FROM sites WHERE is_all_sites = TRUE LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 4. Helper: TRUE when the current user is assigned to "All Sites"
CREATE OR REPLACE FUNCTION auth_is_all_sites_user() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN sites s ON s.id = u.site_id
    WHERE u.id = auth.uid()
      AND u.is_active = TRUE
      AND s.is_all_sites = TRUE
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- Re-apply SELECT policies that need the new logic.
-- Pattern (for tables with a direct site_id):
--   admin/HSM see all
--   OR current user is assigned to "All Sites" (sees everything)
--   OR content is tagged "All Sites" (visible to everyone)
--   OR content is at the user's own site
-- ============================================================

-- USERS
DROP POLICY IF EXISTS users_select ON users;
CREATE POLICY users_select ON users
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR (auth_role() = 'Site Manager' AND (site_id = auth_site_id() OR id = auth.uid()))
    OR id = auth.uid()
  );

-- USER_PPE_RECORDS
DROP POLICY IF EXISTS user_ppe_records_select ON user_ppe_records;
CREATE POLICY user_ppe_records_select ON user_ppe_records
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR (auth_role() = 'Site Manager' AND (site_id = all_sites_id() OR site_id = auth_site_id()))
    OR user_id = auth.uid()
  );

-- DSE_ASSESSMENTS
DROP POLICY IF EXISTS dse_assessments_select ON dse_assessments;
CREATE POLICY dse_assessments_select ON dse_assessments
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR (auth_role() = 'Site Manager' AND (site_id = all_sites_id() OR site_id = auth_site_id()))
    OR user_id = auth.uid()
  );

-- DSE_ASSESSMENT_RESPONSES
DROP POLICY IF EXISTS dse_assessment_responses_select ON dse_assessment_responses;
CREATE POLICY dse_assessment_responses_select ON dse_assessment_responses
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR EXISTS (
      SELECT 1 FROM dse_assessments da
      WHERE da.id = assessment_id
        AND (
          da.user_id = auth.uid()
          OR da.site_id = all_sites_id()
          OR (auth_role() = 'Site Manager' AND da.site_id = auth_site_id())
        )
    )
  );

-- DOCUMENTS
-- Keep site_id IS NULL check for legacy org-wide docs; new docs use all_sites_id()
DROP POLICY IF EXISTS documents_select ON documents;
CREATE POLICY documents_select ON documents
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      site_id IS NULL
      OR site_id = all_sites_id()
      OR auth_role() IN ('System Admin', 'H&S Manager')
      OR auth_is_all_sites_user()
      OR site_id = auth_site_id()
    )
  );

-- RISK_ASSESSMENTS
DROP POLICY IF EXISTS risk_assessments_select ON risk_assessments;
CREATE POLICY risk_assessments_select ON risk_assessments
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR site_id = all_sites_id()
    OR site_id = auth_site_id()
  );

-- RA_HAZARDS
DROP POLICY IF EXISTS ra_hazards_select ON ra_hazards;
CREATE POLICY ra_hazards_select ON ra_hazards
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR EXISTS (
      SELECT 1 FROM risk_assessments ra
      WHERE ra.id = risk_assessment_id
        AND (ra.site_id = all_sites_id() OR ra.site_id = auth_site_id())
    )
  );

-- METHOD_STATEMENTS
DROP POLICY IF EXISTS method_statements_select ON method_statements;
CREATE POLICY method_statements_select ON method_statements
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR site_id = all_sites_id()
    OR site_id = auth_site_id()
  );

-- METHOD_STATEMENT_STEPS
DROP POLICY IF EXISTS method_statement_steps_select ON method_statement_steps;
CREATE POLICY method_statement_steps_select ON method_statement_steps
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR EXISTS (
      SELECT 1 FROM method_statements ms
      WHERE ms.id = method_statement_id
        AND (ms.site_id = all_sites_id() OR ms.site_id = auth_site_id())
    )
  );

-- COSHH_ASSESSMENTS
DROP POLICY IF EXISTS coshh_assessments_select ON coshh_assessments;
CREATE POLICY coshh_assessments_select ON coshh_assessments
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR site_id = all_sites_id()
    OR site_id = auth_site_id()
  );

-- EQUIPMENT
DROP POLICY IF EXISTS equipment_select ON equipment;
CREATE POLICY equipment_select ON equipment
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR site_id = all_sites_id()
    OR site_id = auth_site_id()
  );

-- EQUIPMENT_SERVICE_RECORDS
DROP POLICY IF EXISTS equipment_service_records_select ON equipment_service_records;
CREATE POLICY equipment_service_records_select ON equipment_service_records
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR EXISTS (
      SELECT 1 FROM equipment e
      WHERE e.id = equipment_id
        AND (e.site_id = all_sites_id() OR e.site_id = auth_site_id())
    )
  );

-- FIRE_EXTINGUISHERS
DROP POLICY IF EXISTS fire_extinguishers_select ON fire_extinguishers;
CREATE POLICY fire_extinguishers_select ON fire_extinguishers
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR site_id = all_sites_id()
    OR site_id = auth_site_id()
  );

-- FIRE_EXTINGUISHER_INSPECTIONS
DROP POLICY IF EXISTS fire_ext_inspections_select ON fire_extinguisher_inspections;
CREATE POLICY fire_ext_inspections_select ON fire_extinguisher_inspections
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR EXISTS (
      SELECT 1 FROM fire_extinguishers fe
      WHERE fe.id = fire_extinguisher_id
        AND (fe.site_id = all_sites_id() OR fe.site_id = auth_site_id())
    )
  );

-- FIRE_ALARM_SYSTEMS
DROP POLICY IF EXISTS fire_alarm_systems_select ON fire_alarm_systems;
CREATE POLICY fire_alarm_systems_select ON fire_alarm_systems
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR site_id = all_sites_id()
    OR site_id = auth_site_id()
  );

-- FIRE_ALARM_TESTS
DROP POLICY IF EXISTS fire_alarm_tests_select ON fire_alarm_tests;
CREATE POLICY fire_alarm_tests_select ON fire_alarm_tests
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR EXISTS (
      SELECT 1 FROM fire_alarm_systems fas
      WHERE fas.id = fire_alarm_system_id
        AND (fas.site_id = all_sites_id() OR fas.site_id = auth_site_id())
    )
  );

-- FIRE_DRILLS
DROP POLICY IF EXISTS fire_drills_select ON fire_drills;
CREATE POLICY fire_drills_select ON fire_drills
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR site_id = all_sites_id()
    OR site_id = auth_site_id()
  );

-- INSPECTIONS
DROP POLICY IF EXISTS inspections_select ON inspections;
CREATE POLICY inspections_select ON inspections
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR site_id = all_sites_id()
    OR site_id = auth_site_id()
  );

-- INSPECTION_FINDINGS
DROP POLICY IF EXISTS inspection_findings_select ON inspection_findings;
CREATE POLICY inspection_findings_select ON inspection_findings
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_id
        AND (i.site_id = all_sites_id() OR i.site_id = auth_site_id())
    )
  );

-- INCIDENTS
DROP POLICY IF EXISTS incidents_select ON incidents;
CREATE POLICY incidents_select ON incidents
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR site_id = all_sites_id()
    OR site_id = auth_site_id()
  );

-- CORRECTIVE_ACTIONS
DROP POLICY IF EXISTS corrective_actions_select ON corrective_actions;
CREATE POLICY corrective_actions_select ON corrective_actions
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR site_id = all_sites_id()
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
    OR assigned_to = auth.uid()
  );

-- TRAINING_RECORDS
DROP POLICY IF EXISTS training_records_select ON training_records;
CREATE POLICY training_records_select ON training_records
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR site_id = all_sites_id()
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
    OR user_id = auth.uid()
  );
