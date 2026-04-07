-- ============================================================
-- FILE 25: 00025_ppe_fixes.sql
-- Fix: user_ppe_records.site_id NOT NULL causes silent insert
--      failures when the subject user has no site assigned
--      (e.g. System Admin accounts).
-- Fix: add sort_order to ppe_items (referenced by app code).
-- ============================================================

-- 1. Make site_id nullable on user_ppe_records
ALTER TABLE user_ppe_records ALTER COLUMN site_id DROP NOT NULL;

-- 2. Add sort_order to ppe_items (idempotent)
ALTER TABLE ppe_items ADD COLUMN IF NOT EXISTS sort_order SMALLINT NOT NULL DEFAULT 0;

-- 3. Refresh INSERT / UPDATE RLS to handle NULL site_id
--    (Site Manager can still insert/update for their own site;
--     NULL site_id records are admin-only except the user themselves.)
DROP POLICY IF EXISTS user_ppe_records_insert ON user_ppe_records;
CREATE POLICY user_ppe_records_insert ON user_ppe_records
  FOR INSERT
  WITH CHECK (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );

DROP POLICY IF EXISTS user_ppe_records_update ON user_ppe_records;
CREATE POLICY user_ppe_records_update ON user_ppe_records
  FOR UPDATE
  USING (
    auth_role() IN ('System Admin', 'H&S Manager')
    OR auth_is_all_sites_user()
    OR (auth_role() = 'Site Manager' AND site_id = auth_site_id())
  );
