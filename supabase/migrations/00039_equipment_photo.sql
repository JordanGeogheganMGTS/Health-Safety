-- Add photo storage for equipment records
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS photo_path TEXT;
