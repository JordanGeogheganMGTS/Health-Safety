-- Add optional location field to dse_assessments
-- Records where the assessment was conducted (e.g. Coventry Office, Redditch Office, Home)
ALTER TABLE dse_assessments
  ADD COLUMN IF NOT EXISTS location TEXT;
