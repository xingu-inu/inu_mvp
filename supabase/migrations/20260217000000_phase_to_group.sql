-- Phase → Group 전환
-- phases 테이블을 groups로 리네임하고, 순차 활성화 모델을 제거

-- 1. phases → groups 리네임
ALTER TABLE public.phases RENAME TO groups;

-- 2. tasks.phase_id → tasks.group_id
ALTER TABLE public.tasks RENAME COLUMN phase_id TO group_id;

-- 3. is_completed 추가 + 기존 데이터 마이그레이션
ALTER TABLE public.groups ADD COLUMN is_completed BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE public.groups SET is_completed = TRUE WHERE status = 'completed';
UPDATE public.groups SET completed_at = NOW() WHERE status = 'completed' AND completed_at IS NULL;

-- 4. status 컬럼 삭제
ALTER TABLE public.groups DROP COLUMN status;

-- 5. phase_status enum 삭제
DROP TYPE IF EXISTS phase_status;

-- 6. 인덱스 리네임/재생성
DROP INDEX IF EXISTS idx_phases_goal;
DROP INDEX IF EXISTS idx_phases_goal_active;
DROP INDEX IF EXISTS idx_phases_order;
CREATE INDEX idx_groups_goal ON public.groups(goal_id);
CREATE INDEX idx_groups_completed ON public.groups(goal_id, is_completed);
CREATE INDEX idx_groups_order ON public.groups(goal_id, sort_order);

-- 7. tasks FK 인덱스
DROP INDEX IF EXISTS idx_tasks_phase;
CREATE INDEX idx_tasks_group ON public.tasks(group_id);

-- 8. RLS 정책
DROP POLICY IF EXISTS "Users can CRUD own phases" ON public.groups;
CREATE POLICY "Users can CRUD own groups" ON public.groups FOR ALL
  USING (EXISTS (SELECT 1 FROM public.goals WHERE goals.id = groups.goal_id AND goals.user_id = auth.uid()));

-- 9. 트리거 리네임
DROP TRIGGER IF EXISTS phases_updated_at ON public.groups;
CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
