-- ============================================================
-- FILE 28: 00028_remove_duplicate_all_sites.sql
-- Remove duplicate "All Sites" record that was created manually
-- (without the is_all_sites flag). The correct record is the
-- one inserted by 00023_all_sites.sql with is_all_sites = TRUE.
-- ============================================================

-- Reassign any users pointing at the plain "All Sites" to the
-- correct one (is_all_sites = TRUE), in case anyone was assigned
-- to the wrong record.
UPDATE users
SET site_id = (SELECT id FROM sites WHERE is_all_sites = TRUE LIMIT 1)
WHERE site_id IN (
  SELECT id FROM sites WHERE name = 'All Sites' AND is_all_sites = FALSE
);

-- Delete the duplicate plain "All Sites" record
DELETE FROM sites
WHERE name = 'All Sites'
  AND is_all_sites = FALSE;
