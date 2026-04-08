-- ============================================================
-- FILE 32: 00032_method_statements_schema_fix.sql
-- Aligns method_statements table with the application code
-- ============================================================

-- 1. Add free-text category column (code uses this instead of category_id FK)
ALTER TABLE method_statements
  ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Make category_id nullable (no longer required by the form)
ALTER TABLE method_statements
  ALTER COLUMN category_id DROP NOT NULL;

-- 3. Make authored_date optional with a default so inserts without it succeed
ALTER TABLE method_statements
  ALTER COLUMN authored_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN authored_date DROP NOT NULL;

-- 4. Make method_statement_steps.title optional (code doesn't supply it)
ALTER TABLE method_statement_steps
  ALTER COLUMN title SET DEFAULT '',
  ALTER COLUMN title DROP NOT NULL;
