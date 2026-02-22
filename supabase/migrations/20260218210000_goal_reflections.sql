-- Enable moddatetime extension for auto-updating updated_at
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- Goal-level reflections for Review
CREATE TABLE IF NOT EXISTS goal_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  summary TEXT,
  progress_feeling TEXT CHECK (progress_feeling IN ('terrible', 'bad', 'neutral', 'good', 'great')),
  next_focus TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(goal_id, period_start, period_end)
);

ALTER TABLE goal_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goal reflections"
  ON goal_reflections FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at on row changes
CREATE TRIGGER set_goal_reflections_updated_at
  BEFORE UPDATE ON goal_reflections
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
