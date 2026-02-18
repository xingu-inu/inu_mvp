-- Weekly Reflections table
-- 주간 구조화 회고: 잘한 점 / 어려웠던 점 / 다음 주 다짐

CREATE TABLE IF NOT EXISTS public.weekly_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,  -- Monday of the week (YYYY-MM-DD)
  highlight TEXT,             -- 잘한 점
  challenge TEXT,             -- 어려웠던 점
  next_focus TEXT,            -- 다음 주 다짐
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 유저당 주 1개
  CONSTRAINT uq_weekly_reflections_user_week UNIQUE (user_id, week_start)
);

-- RLS
ALTER TABLE public.weekly_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own weekly reflections"
  ON public.weekly_reflections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_weekly_reflections_user_week
  ON public.weekly_reflections(user_id, week_start DESC);
