-- Monthly Reflections table
-- Stores a one-line reflection per month per user

CREATE TABLE IF NOT EXISTS monthly_reflections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, month_start)
);

ALTER TABLE monthly_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own monthly reflections"
  ON monthly_reflections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
