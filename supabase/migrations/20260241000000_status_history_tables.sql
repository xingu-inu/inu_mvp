-- Status History Tables
-- Goal/Task 상태 변경 히스토리를 기록하여 여정 타임라인에 활용

-- ============================================
-- Goal Status History
-- ============================================
CREATE TABLE goal_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_status goal_status NOT NULL,
  to_status goal_status NOT NULL,
  reason TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_status_history_goal ON goal_status_history(goal_id, created_at DESC);
CREATE INDEX idx_goal_status_history_user ON goal_status_history(user_id, created_at DESC);

ALTER TABLE goal_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own goal status history"
  ON goal_status_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal status history"
  ON goal_status_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Task Status History
-- ============================================
CREATE TABLE task_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_status task_status NOT NULL,
  to_status task_status NOT NULL,
  reason TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_status_history_task ON task_status_history(task_id, created_at DESC);
CREATE INDEX idx_task_status_history_user ON task_status_history(user_id, created_at DESC);

ALTER TABLE task_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own task status history"
  ON task_status_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task status history"
  ON task_status_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Backfill: 기존 status_change_reason이 있는 데이터 마이그레이션
-- from_status는 정확한 이전 상태를 알 수 없으므로 'active'로 설정
-- ============================================
INSERT INTO goal_status_history (goal_id, user_id, from_status, to_status, reason, note, created_at)
SELECT g.id, g.user_id, 'active'::goal_status, g.status, g.status_change_reason, g.status_change_note, g.updated_at
FROM goals g
WHERE g.status_change_reason IS NOT NULL;

INSERT INTO task_status_history (task_id, user_id, from_status, to_status, reason, note, created_at)
SELECT t.id, t.user_id, 'active'::task_status, t.status, t.status_change_reason, t.status_change_note, t.updated_at
FROM tasks t
WHERE t.status_change_reason IS NOT NULL;
