-- ============================================================
-- FILE 33: 00033_method_statements_risk_assessment.sql
-- Adds optional FK to risk_assessments on method_statements
-- ============================================================

ALTER TABLE method_statements
  ADD COLUMN IF NOT EXISTS risk_assessment_id UUID REFERENCES risk_assessments(id) ON DELETE SET NULL;
