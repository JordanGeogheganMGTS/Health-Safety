-- ============================================================
-- FILE 30: 00030_corrective_actions_add_closed_status.sql
-- Add 'Closed' to the corrective_actions status check constraint
-- ============================================================

ALTER TABLE corrective_actions
  DROP CONSTRAINT corrective_actions_status_check;

ALTER TABLE corrective_actions
  ADD CONSTRAINT corrective_actions_status_check
  CHECK (status IN ('Open', 'In Progress', 'Completed', 'Verified', 'Overdue', 'Cancelled', 'Closed'));
