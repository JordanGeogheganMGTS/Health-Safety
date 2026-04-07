-- ============================================================
-- Migration 00024: Inspection schema fixes
--
-- 1. Add site_id to inspection_templates (enables per-site templates)
-- 2. Add guidance to inspection_template_items (inspector hints)
-- 3. Seed finding_severity lookup values (were missing from seed)
-- ============================================================

-- Templates can optionally be scoped to a site
ALTER TABLE inspection_templates
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Guidance notes for checklist items
ALTER TABLE inspection_template_items
  ADD COLUMN IF NOT EXISTS guidance TEXT;

-- Seed finding severity values (referenced by inspection_findings.severity_id)
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'finding_severity'), 'low',      'Low',      1),
  ((SELECT id FROM lookup_categories WHERE key = 'finding_severity'), 'medium',   'Medium',   2),
  ((SELECT id FROM lookup_categories WHERE key = 'finding_severity'), 'high',     'High',     3),
  ((SELECT id FROM lookup_categories WHERE key = 'finding_severity'), 'critical', 'Critical', 4)
ON CONFLICT DO NOTHING;
