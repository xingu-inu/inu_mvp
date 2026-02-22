-- Why Temperature: Goal Reflection에 Why 온도 체크 컬럼 추가
ALTER TABLE goal_reflections
  ADD COLUMN IF NOT EXISTS why_temperature SMALLINT CHECK (why_temperature BETWEEN 1 AND 5);

COMMENT ON COLUMN goal_reflections.why_temperature IS 'How resonant the goal Why still feels (1=cold, 5=burning)';
