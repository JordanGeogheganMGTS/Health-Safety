-- The equipment forms use plain status strings and service_interval_months
-- rather than the lookup FK columns from the original migration.
-- Align the schema so the forms can insert/update successfully.

-- Make the lookup FK columns nullable (forms don't provide them)
ALTER TABLE equipment ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE equipment ALTER COLUMN status_id DROP NOT NULL;

-- Add plain status column the forms write to
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'Operational';

-- Add service interval column the forms write to
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS service_interval_months INTEGER NOT NULL DEFAULT 12;
