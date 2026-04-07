-- ============================================================
-- FILE 27: 00027_incident_person_type_lookup.sql
-- Convert injured_person_type from hardcoded CHECK constraint
-- to a lookup-managed dropdown
-- ============================================================

-- 1. Drop the existing CHECK constraint on incidents.injured_person_type
ALTER TABLE incidents
  DROP CONSTRAINT IF EXISTS incidents_injured_person_type_check;

-- 2. Add the lookup category
INSERT INTO lookup_categories (key, label, description, is_system, is_active)
VALUES (
  'incident_person_type',
  'Incident — Person Type',
  'Types of person involved in an incident (injured / affected person)',
  false,
  true
)
ON CONFLICT (key) DO NOTHING;

-- 3. Seed default values
INSERT INTO lookup_values (category_id, value, label, sort_order, is_active)
SELECT
  id AS category_id,
  value,
  label,
  sort_order,
  true
FROM lookup_categories, (VALUES
  ('employee',          'Employee',          1),
  ('contractor',        'Contractor',        2),
  ('visitor',           'Visitor',           3),
  ('member_of_public',  'Member of Public',  4),
  ('other',             'Other',             5)
) AS vals(value, label, sort_order)
WHERE lookup_categories.key = 'incident_person_type'
ON CONFLICT DO NOTHING;
