-- Add status change tracking fields to goals table
-- Stores the most recent reason and note when a goal's status changes
-- Used for growth mindset UX and future AI reference

ALTER TABLE goals
  ADD COLUMN status_change_reason text,
  ADD COLUMN status_change_note text;

COMMENT ON COLUMN goals.status_change_reason IS 'Most recent status change reason tag (e.g. time, interest, priority)';
COMMENT ON COLUMN goals.status_change_note IS 'Most recent free-text note about status change';
