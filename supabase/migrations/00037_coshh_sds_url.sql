-- Add safety data sheet URL field to COSHH assessments
ALTER TABLE coshh_assessments ADD COLUMN IF NOT EXISTS sds_url TEXT;
