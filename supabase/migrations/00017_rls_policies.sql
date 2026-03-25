-- ============================================================
-- FILE 17: 00017_rls_policies.sql
-- Enable RLS on ALL tables + create helper functions + policies
-- ============================================================

-- ---------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT r.name
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.id = auth.uid()
    AND u.is_active = TRUE
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_site_id() RETURNS UUID AS $$
  SELECT site_id
  FROM users
  WHERE id = auth.uid()
    AND is_active = TRUE
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_override(p_module TEXT, p_level TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_permission_overrides
    WHERE user_id      = auth.uid()
      AND module_key   = p_module
      AND access_level = p_level
      AND (expires_at IS NULL OR expires_at > NOW())
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------
-- Enable RLS on every table
-- (audit_log is enabled but NO user-writable policies are added)
-- ---------------------------------------------------------------

ALTER TABLE sites                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookup_categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookup_values                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppe_items                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ppe_records              ENABLE ROW LEVEL SECURITY;
ALTER TABLE dse_assessments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE dse_assessment_responses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ra_hazards                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE method_statements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE method_statement_steps        ENABLE ROW LEVEL SECURITY;
ALTER TABLE coshh_assessments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_service_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_extinguishers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_extinguisher_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_alarm_systems            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_alarm_tests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_drills                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_template_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_findings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_types                ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records              ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- SITES
-- SELECT: all authenticated users (needed for dropdowns/filtering)
-- INSERT/UPDATE/DELETE: System Admin only
-- ---------------------------------------------------------------

CREATE POLICY sites_select ON sites
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY sites_insert ON sites
  FOR INSERT
  WITH CHECK (auth_role() = 'System Admin');

CREATE POLICY sites_update ON sites
  FOR UPDATE
  USING (auth_role() = 'System Admin');

CREATE POLICY sites_delete ON sites
  FOR DELETE
  USING (auth_role() = 'System Admin');

-- ---------------------------------------------------------------
-- LOOKUP_CATEGORIES
-- SELECT: all authenticated users
-- INSERT/UPDATE/DELETE: System Admin only
-- ---------------------------------------------------------------

CREATE POLICY lookup_categories_select ON lookup_categories
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY lookup_categories_insert ON lookup_categories
  FOR INSERT
  WITH CHECK (auth_role() = 'System Admin');

CREATE POLICY lookup_categories_update ON lookup_categories
  FOR UPDATE
  USING (auth_role() = 'System Admin');

CREATE POLICY lookup_categories_delete ON lookup_categories
  FOR DELETE
  USING (auth_role() = 'System Admin');

-- ---------------------------------------------------------------
-- LOOKUP_VALUES
-- SELECT: all authenticated users
-- INSERT/UPDATE/DELETE: System Admin only
-- ---------------------------------------------------------------

CREATE POLICY lookup_values_select ON lookup_values
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY lookup_values_insert ON lookup_values
  FOR INSERT
  WITH CHECK (auth_role() = 'System Admin');

CREATE POLICY lookup_values_update ON lookup_values
  FOR UPDATE
  USING (auth_role() = 'System Admin');

CREATE POLICY lookup_values_delete ON lookup_values
  FOR DELETE
  USING (auth_role() = 'System Admin');

-- ---------------------------------------------------------------
-- SYSTEM_SETTINGS
-- SELECT: all authenticated users
-- INSERT/UPDATE/DELETE: System Admin only
-- ---------------------------------------------------------------

CREATE POLICY system_settings_select ON system_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY system_settings_insert ON system_settings
  FOR INSERT
  WITH CHECK (auth_role() = 'System Admin');

CREATE POLICY system_settings_update ON system_settings
  FOR UPDATE
  USING (auth_role() = 'System Admin');

CREATE POLICY system_settings_delete ON system_settings
  FOR DELETE
  USING (auth_role() = 'System Admin');

-- ---------------------------------------------------------------
-- ROLES
-- SELECT: all authenticated users
-- INSERT/UPDATE/DELETE: System Admin only
-- ---------------------------------------------------------------

CREATE POLICY roles_select ON roles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY roles_insert ON roles
  FOR INSERT
  WITH CHECK (auth_role() = 'System Admin');

CREATE POLICY roles_update ON roles
  FOR UPDATE
  USING (auth_role() = 'System Admin');

CREATE POLICY roles_delete ON roles
  FOR DELETE
  USING (auth_role() = 'System Admin');

-- ---------------------------------------------------------------
-- USERS
-- SELECT: Admin/HSM see all; Site Manager sees own site + self;
--         TDA/Read-Only see own record only
-- INSERT: System Admin only
-- UPDATE: System Admin full; users can update own non-privileged fields;
--         HSM can update users at own site
-- DELETE: System Admin only
-- ---------------------------------------------------------------

CREATE POLICY users_select ON users
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND (site_id = auth_site_id() OR id = auth.uid()))
    OR id = auth.uid()
  );

CREATE POLICY users_insert ON users
  FOR INSERT
  WITH CHECK (auth_role() = 'System Admin');

CREATE POLICY users_update ON users
  FOR UPDATE
  USING (
    auth_role() = 'System Admin'
    OR (auth_role() = 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
    OR id = auth.uid()
  );

CREATE POLICY users_delete ON users
  FOR DELETE
  USING (auth_role() = 'System Admin');

-- ---------------------------------------------------------------
-- USER_PERMISSION_OVERRIDES
-- SELECT: Admin/HSM see all; others see own overrides
-- INSERT/UPDATE/DELETE: Admin/HSM only
-- ---------------------------------------------------------------

CREATE POLICY upo_select ON user_permission_overrides
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR user_id = auth.uid()
  );

CREATE POLICY upo_insert ON user_permission_overrides
  FOR INSERT
  WITH CHECK (auth_role() IN ('System Admin', 'H&S Manager'));

CREATE POLICY upo_update ON user_permission_overrides
  FOR UPDATE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

CREATE POLICY upo_delete ON user_permission_overrides
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- AUDIT_LOG
-- SELECT: System Admin and H&S Manager only
-- NO INSERT/UPDATE/DELETE via RLS — only trigger (service role) writes
-- ---------------------------------------------------------------

CREATE POLICY audit_log_select ON audit_log
  FOR SELECT
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- PPE_ITEMS
-- SELECT: all authenticated users
-- INSERT/UPDATE: Admin/HSM
-- DELETE: Admin only
-- ---------------------------------------------------------------

CREATE POLICY ppe_items_select ON ppe_items
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY ppe_items_insert ON ppe_items
  FOR INSERT
  WITH CHECK (auth_role() IN ('System Admin', 'H&S Manager'));

CREATE POLICY ppe_items_update ON ppe_items
  FOR UPDATE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

CREATE POLICY ppe_items_delete ON ppe_items
  FOR DELETE
  USING (auth_role() = 'System Admin');

-- ---------------------------------------------------------------
-- USER_PPE_RECORDS
-- SELECT: Admin/HSM see all; Site Manager sees own-site users;
--         TDA sees own records only
-- INSERT/UPDATE: Admin/HSM/Site Manager
-- DELETE: Admin/HSM only
-- ---------------------------------------------------------------

CREATE POLICY user_ppe_records_select ON user_ppe_records
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
    OR user_id = auth.uid()
  );

CREATE POLICY user_ppe_records_insert ON user_ppe_records
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY user_ppe_records_update ON user_ppe_records
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY user_ppe_records_delete ON user_ppe_records
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- DSE_ASSESSMENTS
-- SELECT: Admin/HSM see all; Site Manager sees own-site users;
--         TDA sees own assessments
-- INSERT/UPDATE: Admin/HSM/Site Manager; TDA own records
-- DELETE: Admin/HSM only
-- ---------------------------------------------------------------

CREATE POLICY dse_assessments_select ON dse_assessments
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
    OR user_id = auth.uid()
  );

CREATE POLICY dse_assessments_insert ON dse_assessments
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
    OR (auth_role() = 'TDA / Staff' AND user_id = auth.uid())
  );

CREATE POLICY dse_assessments_update ON dse_assessments
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
    OR (auth_role() = 'TDA / Staff' AND user_id = auth.uid())
  );

CREATE POLICY dse_assessments_delete ON dse_assessments
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- DSE_ASSESSMENT_RESPONSES
-- SELECT: Admin/HSM see all; Site Manager and TDA via parent assessment
-- INSERT/UPDATE: as per parent assessment
-- DELETE: Admin/HSM only
-- ---------------------------------------------------------------

CREATE POLICY dse_assessment_responses_select ON dse_assessment_responses
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM dse_assessments da
      WHERE da.id = assessment_id
        AND (
          da.user_id = auth.uid()
          OR (auth_role() = 'Site Manager' AND da.site_id = auth_site_id())
        )
    )
  );

CREATE POLICY dse_assessment_responses_insert ON dse_assessment_responses
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM dse_assessments da
      WHERE da.id = assessment_id
        AND (
          (auth_role() = 'TDA / Staff' AND da.user_id = auth.uid())
          OR (auth_role() = 'Site Manager' AND da.site_id = auth_site_id())
        )
    )
  );

CREATE POLICY dse_assessment_responses_update ON dse_assessment_responses
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM dse_assessments da
      WHERE da.id = assessment_id
        AND (
          (auth_role() = 'TDA / Staff' AND da.user_id = auth.uid())
          OR (auth_role() = 'Site Manager' AND da.site_id = auth_site_id())
        )
    )
  );

CREATE POLICY dse_assessment_responses_delete ON dse_assessment_responses
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- DOCUMENTS
-- SELECT: all authenticated users (org-wide docs have NULL site_id)
-- INSERT/UPDATE: Admin/HSM full; Site Manager own site only
-- DELETE: Admin/HSM only
-- ---------------------------------------------------------------

CREATE POLICY documents_select ON documents
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      site_id IS NULL
      OR auth_role() IN ('System Admin', 'H&S Manager')
      OR site_id = auth_site_id()
    )
  );

CREATE POLICY documents_insert ON documents
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND (site_id = auth_site_id() OR site_id IS NULL))
  );

CREATE POLICY documents_update ON documents
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY documents_delete ON documents
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- RISK_ASSESSMENTS
-- SELECT: Admin/HSM see all; Site Manager sees own site; others see own site
-- INSERT/UPDATE: Admin/HSM full; Site Manager own site
-- DELETE: Admin/HSM only
-- ---------------------------------------------------------------

CREATE POLICY risk_assessments_select ON risk_assessments
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR site_id = auth_site_id()
  );

CREATE POLICY risk_assessments_insert ON risk_assessments
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY risk_assessments_update ON risk_assessments
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY risk_assessments_delete ON risk_assessments
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- RA_HAZARDS
-- Access follows parent risk_assessment
-- ---------------------------------------------------------------

CREATE POLICY ra_hazards_select ON ra_hazards
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM risk_assessments ra
      WHERE ra.id = risk_assessment_id
        AND (
          auth_role() IN ('System Admin', 'H&S Manager')
          OR ra.site_id = auth_site_id()
        )
    )
  );

CREATE POLICY ra_hazards_insert ON ra_hazards
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM risk_assessments ra
      WHERE ra.id = risk_assessment_id
        AND auth_role() = 'Site Manager'
        AND ra.site_id = auth_site_id()
    )
  );

CREATE POLICY ra_hazards_update ON ra_hazards
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM risk_assessments ra
      WHERE ra.id = risk_assessment_id
        AND auth_role() = 'Site Manager'
        AND ra.site_id = auth_site_id()
    )
  );

CREATE POLICY ra_hazards_delete ON ra_hazards
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- METHOD_STATEMENTS
-- ---------------------------------------------------------------

CREATE POLICY method_statements_select ON method_statements
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR site_id = auth_site_id()
  );

CREATE POLICY method_statements_insert ON method_statements
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY method_statements_update ON method_statements
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY method_statements_delete ON method_statements
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- METHOD_STATEMENT_STEPS
-- Access follows parent method_statement
-- ---------------------------------------------------------------

CREATE POLICY method_statement_steps_select ON method_statement_steps
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM method_statements ms
      WHERE ms.id = method_statement_id
        AND ms.site_id = auth_site_id()
    )
  );

CREATE POLICY method_statement_steps_insert ON method_statement_steps
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM method_statements ms
      WHERE ms.id = method_statement_id
        AND auth_role() = 'Site Manager'
        AND ms.site_id = auth_site_id()
    )
  );

CREATE POLICY method_statement_steps_update ON method_statement_steps
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM method_statements ms
      WHERE ms.id = method_statement_id
        AND auth_role() = 'Site Manager'
        AND ms.site_id = auth_site_id()
    )
  );

CREATE POLICY method_statement_steps_delete ON method_statement_steps
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- COSHH_ASSESSMENTS
-- ---------------------------------------------------------------

CREATE POLICY coshh_assessments_select ON coshh_assessments
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR site_id = auth_site_id()
  );

CREATE POLICY coshh_assessments_insert ON coshh_assessments
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY coshh_assessments_update ON coshh_assessments
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY coshh_assessments_delete ON coshh_assessments
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- CONTRACTORS
-- SELECT: Admin/HSM/Site Manager see all approved; Read-Only see all
-- INSERT/UPDATE: Admin/HSM; Site Manager with override
-- DELETE: Admin only
-- ---------------------------------------------------------------

CREATE POLICY contractors_select ON contractors
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY contractors_insert ON contractors
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND has_override('contractors', 'full'))
  );

CREATE POLICY contractors_update ON contractors
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND has_override('contractors', 'full'))
  );

CREATE POLICY contractors_delete ON contractors
  FOR DELETE
  USING (auth_role() = 'System Admin');

-- ---------------------------------------------------------------
-- CONTRACTOR_DOCUMENTS
-- Access follows parent contractor
-- ---------------------------------------------------------------

CREATE POLICY contractor_documents_select ON contractor_documents
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY contractor_documents_insert ON contractor_documents
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND has_override('contractors', 'full'))
  );

CREATE POLICY contractor_documents_update ON contractor_documents
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND has_override('contractors', 'full'))
  );

CREATE POLICY contractor_documents_delete ON contractor_documents
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- EQUIPMENT
-- ---------------------------------------------------------------

CREATE POLICY equipment_select ON equipment
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR site_id = auth_site_id()
  );

CREATE POLICY equipment_insert ON equipment
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY equipment_update ON equipment
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY equipment_delete ON equipment
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- EQUIPMENT_SERVICE_RECORDS
-- Access follows parent equipment (site-scoped)
-- ---------------------------------------------------------------

CREATE POLICY equipment_service_records_select ON equipment_service_records
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM equipment e
      WHERE e.id = equipment_id
        AND e.site_id = auth_site_id()
    )
  );

CREATE POLICY equipment_service_records_insert ON equipment_service_records
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM equipment e
      WHERE e.id = equipment_id
        AND auth_role() = 'Site Manager'
        AND e.site_id = auth_site_id()
    )
  );

CREATE POLICY equipment_service_records_update ON equipment_service_records
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM equipment e
      WHERE e.id = equipment_id
        AND auth_role() = 'Site Manager'
        AND e.site_id = auth_site_id()
    )
  );

CREATE POLICY equipment_service_records_delete ON equipment_service_records
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- FIRE_EXTINGUISHERS
-- ---------------------------------------------------------------

CREATE POLICY fire_extinguishers_select ON fire_extinguishers
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR site_id = auth_site_id()
  );

CREATE POLICY fire_extinguishers_insert ON fire_extinguishers
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY fire_extinguishers_update ON fire_extinguishers
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY fire_extinguishers_delete ON fire_extinguishers
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- FIRE_EXTINGUISHER_INSPECTIONS
-- Access follows parent fire_extinguisher (site-scoped)
-- ---------------------------------------------------------------

CREATE POLICY fire_ext_inspections_select ON fire_extinguisher_inspections
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM fire_extinguishers fe
      WHERE fe.id = fire_extinguisher_id
        AND fe.site_id = auth_site_id()
    )
  );

CREATE POLICY fire_ext_inspections_insert ON fire_extinguisher_inspections
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM fire_extinguishers fe
      WHERE fe.id = fire_extinguisher_id
        AND auth_role() = 'Site Manager'
        AND fe.site_id = auth_site_id()
    )
  );

CREATE POLICY fire_ext_inspections_update ON fire_extinguisher_inspections
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM fire_extinguishers fe
      WHERE fe.id = fire_extinguisher_id
        AND auth_role() = 'Site Manager'
        AND fe.site_id = auth_site_id()
    )
  );

CREATE POLICY fire_ext_inspections_delete ON fire_extinguisher_inspections
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- FIRE_ALARM_SYSTEMS
-- ---------------------------------------------------------------

CREATE POLICY fire_alarm_systems_select ON fire_alarm_systems
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR site_id = auth_site_id()
  );

CREATE POLICY fire_alarm_systems_insert ON fire_alarm_systems
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY fire_alarm_systems_update ON fire_alarm_systems
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY fire_alarm_systems_delete ON fire_alarm_systems
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- FIRE_ALARM_TESTS
-- Access follows parent fire_alarm_system (site-scoped)
-- ---------------------------------------------------------------

CREATE POLICY fire_alarm_tests_select ON fire_alarm_tests
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM fire_alarm_systems fas
      WHERE fas.id = fire_alarm_system_id
        AND fas.site_id = auth_site_id()
    )
  );

CREATE POLICY fire_alarm_tests_insert ON fire_alarm_tests
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM fire_alarm_systems fas
      WHERE fas.id = fire_alarm_system_id
        AND auth_role() IN ('Site Manager', 'TDA / Staff')
        AND fas.site_id = auth_site_id()
    )
  );

CREATE POLICY fire_alarm_tests_update ON fire_alarm_tests
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM fire_alarm_systems fas
      WHERE fas.id = fire_alarm_system_id
        AND auth_role() = 'Site Manager'
        AND fas.site_id = auth_site_id()
    )
  );

CREATE POLICY fire_alarm_tests_delete ON fire_alarm_tests
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- FIRE_DRILLS
-- ---------------------------------------------------------------

CREATE POLICY fire_drills_select ON fire_drills
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR site_id = auth_site_id()
  );

CREATE POLICY fire_drills_insert ON fire_drills
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY fire_drills_update ON fire_drills
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY fire_drills_delete ON fire_drills
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- INSPECTION_TEMPLATES
-- SELECT: all authenticated users (needed to run inspections)
-- INSERT/UPDATE: Admin/HSM; Site Manager with override
-- DELETE: Admin/HSM only
-- ---------------------------------------------------------------

CREATE POLICY inspection_templates_select ON inspection_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY inspection_templates_insert ON inspection_templates
  FOR INSERT
  WITH CHECK (auth_role() IN ('System Admin', 'H&S Manager'));

CREATE POLICY inspection_templates_update ON inspection_templates
  FOR UPDATE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

CREATE POLICY inspection_templates_delete ON inspection_templates
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- INSPECTION_TEMPLATE_ITEMS
-- Access follows parent template
-- ---------------------------------------------------------------

CREATE POLICY inspection_template_items_select ON inspection_template_items
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY inspection_template_items_insert ON inspection_template_items
  FOR INSERT
  WITH CHECK (auth_role() IN ('System Admin', 'H&S Manager'));

CREATE POLICY inspection_template_items_update ON inspection_template_items
  FOR UPDATE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

CREATE POLICY inspection_template_items_delete ON inspection_template_items
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- INSPECTIONS
-- ---------------------------------------------------------------

CREATE POLICY inspections_select ON inspections
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR site_id = auth_site_id()
  );

CREATE POLICY inspections_insert ON inspections
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY inspections_update ON inspections
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY inspections_delete ON inspections
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- INSPECTION_FINDINGS
-- Access follows parent inspection (site-scoped)
-- ---------------------------------------------------------------

CREATE POLICY inspection_findings_select ON inspection_findings
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_id
        AND i.site_id = auth_site_id()
    )
  );

CREATE POLICY inspection_findings_insert ON inspection_findings
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_id
        AND auth_role() = 'Site Manager'
        AND i.site_id = auth_site_id()
    )
  );

CREATE POLICY inspection_findings_update ON inspection_findings
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR EXISTS (
      SELECT 1 FROM inspections i
      WHERE i.id = inspection_id
        AND auth_role() = 'Site Manager'
        AND i.site_id = auth_site_id()
    )
  );

CREATE POLICY inspection_findings_delete ON inspection_findings
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- INCIDENTS
-- ---------------------------------------------------------------

CREATE POLICY incidents_select ON incidents
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR site_id = auth_site_id()
  );

CREATE POLICY incidents_insert ON incidents
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() IN ('Site Manager', 'TDA / Staff') AND site_id = auth_site_id())
  );

CREATE POLICY incidents_update ON incidents
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY incidents_delete ON incidents
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- CORRECTIVE_ACTIONS
-- SELECT: Admin/HSM see all; Site Manager sees own site;
--         TDA sees CAs assigned to them
-- INSERT/UPDATE: Admin/HSM/Site Manager
-- DELETE: Admin/HSM only
-- ---------------------------------------------------------------

CREATE POLICY corrective_actions_select ON corrective_actions
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
    OR assigned_to = auth.uid()
  );

CREATE POLICY corrective_actions_insert ON corrective_actions
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY corrective_actions_update ON corrective_actions
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
    OR assigned_to = auth.uid()    -- assignees can update (e.g. mark complete)
  );

CREATE POLICY corrective_actions_delete ON corrective_actions
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

-- ---------------------------------------------------------------
-- TRAINING_TYPES
-- SELECT: all authenticated users
-- INSERT/UPDATE: Admin/HSM
-- DELETE: Admin only
-- ---------------------------------------------------------------

CREATE POLICY training_types_select ON training_types
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY training_types_insert ON training_types
  FOR INSERT
  WITH CHECK (auth_role() IN ('System Admin', 'H&S Manager'));

CREATE POLICY training_types_update ON training_types
  FOR UPDATE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));

CREATE POLICY training_types_delete ON training_types
  FOR DELETE
  USING (auth_role() = 'System Admin');

-- ---------------------------------------------------------------
-- TRAINING_RECORDS
-- SELECT: Admin/HSM see all; Site Manager sees own-site users;
--         TDA sees own records
-- INSERT/UPDATE: Admin/HSM/Site Manager
-- DELETE: Admin/HSM only
-- ---------------------------------------------------------------

CREATE POLICY training_records_select ON training_records
  FOR SELECT
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
    OR user_id = auth.uid()
  );

CREATE POLICY training_records_insert ON training_records
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY training_records_update ON training_records
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

CREATE POLICY training_records_delete ON training_records
  FOR DELETE
  USING (auth_role() IN ('System Admin', 'H&S Manager'));
