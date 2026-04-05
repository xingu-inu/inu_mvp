-- Hidden Timeline Events
-- Soft-delete (hide) for timeline items in 나의 흐름

CREATE TABLE hidden_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

ALTER TABLE hidden_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hidden events"
  ON hidden_timeline_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_hidden_timeline_user ON hidden_timeline_events(user_id);
