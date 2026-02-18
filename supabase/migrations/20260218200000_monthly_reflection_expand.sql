-- Expand monthly_reflections with highlight and challenge fields
-- to match weekly_reflections structure (highlight, challenge, next_focus/summary)

ALTER TABLE monthly_reflections
  ADD COLUMN IF NOT EXISTS highlight text,
  ADD COLUMN IF NOT EXISTS challenge text;
