-- ============================================================
-- FILE 31: 00031_extinguisher_size.sql
-- Add extinguisher_size lookup + size_id column on fire_extinguishers
-- ============================================================

-- Lookup category
INSERT INTO lookup_categories (key, label, description) VALUES
  ('extinguisher_size', 'Fire Extinguisher Size', 'Sizes of fire extinguishers')
ON CONFLICT (key) DO NOTHING;

-- Seed common sizes
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_size'), '6ltr', '6ltr', 1),
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_size'), '9ltr', '9ltr', 2),
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_size'), '3ltr', '3ltr', 3),
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_size'), '2kg',  '2kg',  4)
ON CONFLICT DO NOTHING;

-- Add nullable size_id column to fire_extinguishers
ALTER TABLE fire_extinguishers
  ADD COLUMN IF NOT EXISTS size_id UUID REFERENCES lookup_values(id);
