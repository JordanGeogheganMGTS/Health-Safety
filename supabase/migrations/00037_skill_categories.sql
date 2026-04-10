-- ============================================================
-- FILE 37: 00037_skill_categories.sql
-- Skills Matrix: category grouping + user-to-category assignments
-- ============================================================

-- 1. Categories lookup table
CREATE TABLE skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Link each skill to a category (nullable — existing skills remain uncategorised until assigned)
ALTER TABLE skill_definitions
  ADD COLUMN category_id UUID REFERENCES skill_categories(id) ON DELETE SET NULL;

-- 3. User ↔ category assignments (controls which skill groups appear on a user's profile)
CREATE TABLE skill_matrix_user_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(user_id, category_id)
);
