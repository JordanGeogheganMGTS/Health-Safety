-- ============================================================
-- FILE 36: 00036_rename_tda_staff_role.sql
-- Rename role 'TDA / Staff' to 'Staff'
-- ============================================================

-- 1. Rename the role record
UPDATE roles
SET name = 'Staff'
WHERE name = 'TDA / Staff';

-- 2. Fix RLS policies that hard-coded 'TDA / Staff'
--    We drop and recreate each affected policy.

-- dse_assessments_insert
DROP POLICY IF EXISTS dse_assessments_insert ON dse_assessments;
CREATE POLICY dse_assessments_insert ON dse_assessments
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
    OR (auth_role() = 'Staff' AND user_id = auth.uid())
  );

-- dse_assessments_update
DROP POLICY IF EXISTS dse_assessments_update ON dse_assessments;
CREATE POLICY dse_assessments_update ON dse_assessments
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
    OR (auth_role() = 'Staff' AND user_id = auth.uid())
  );

-- fire_alarm_tests_insert
DROP POLICY IF EXISTS fire_alarm_tests_insert ON fire_alarm_tests;
CREATE POLICY fire_alarm_tests_insert ON fire_alarm_tests
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM fire_alarm_systems fas
      WHERE fas.id = fire_alarm_system_id
        AND auth_role() IN ('Site Manager', 'Staff')
        AND fas.site_id = auth_site_id()
    )
  );

-- incidents_insert
DROP POLICY IF EXISTS incidents_insert ON incidents;
CREATE POLICY incidents_insert ON incidents
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() IN ('Site Manager', 'Staff') AND site_id = auth_site_id())
  );
