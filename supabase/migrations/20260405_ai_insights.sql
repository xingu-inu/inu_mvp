-- profiles에 avatar_preset 컬럼 추가
ALTER TABLE profiles ADD COLUMN avatar_preset text;

-- ai_insights 테이블 생성
CREATE TABLE ai_insights (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text NOT NULL,
  sort_order  text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own insights"
  ON ai_insights FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_ai_insights_user ON ai_insights(user_id);
