-- ============================================================
-- FILE 38: 00038_skill_certificate_fields.sql
-- Add certificate and revocation tracking to skill_competencies
-- ============================================================

ALTER TABLE skill_competencies
  ADD COLUMN certificate_path       TEXT,
  ADD COLUMN certificate_signed_by  UUID REFERENCES users(id),
  ADD COLUMN certificate_signed_at  TIMESTAMPTZ,
  ADD COLUMN training_record_id     UUID,
  ADD COLUMN revoked_at             TIMESTAMPTZ,
  ADD COLUMN revoked_by             UUID REFERENCES users(id),
  ADD COLUMN revocation_reason      TEXT;
