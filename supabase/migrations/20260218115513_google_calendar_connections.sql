-- Google Calendar 연동 테이블
CREATE TABLE google_calendar_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own connection"
  ON google_calendar_connections FOR ALL
  USING (auth.uid() = user_id);

-- tasks 테이블에 google_event_id 컬럼 추가
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS google_event_id TEXT;
