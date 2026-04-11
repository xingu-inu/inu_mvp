-- Activity Log
-- 로드맵 CRUD 이벤트(생성/이름변경/why수정/이동/삭제)를 '나의 흐름' 타임라인에 보여주기 위한
-- 범용 활동 로그 테이블. 상태 전환은 기존 goal_status_history/task_status_history에 계속 기록되며,
-- 여기서는 상태 외 모든 CRUD 이벤트만 담는다.

create type activity_entity_type as enum ('area', 'goal', 'group', 'task');
create type activity_action_type as enum ('created', 'renamed', 'why_updated', 'moved', 'deleted');

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type activity_entity_type not null,
  entity_id uuid not null,
  action activity_action_type not null,
  -- 엔티티가 삭제된 뒤에도 타임라인에서 라벨/부모 경로를 복원하기 위한 스냅샷
  entity_name text,
  area_id uuid,
  goal_id uuid,
  -- 변경 상세 (rename: { from, to }, move: { from_area_id, to_area_id, ... }, deleted: { cascade } 등)
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_log_user_created on activity_log(user_id, created_at desc);
create index idx_activity_log_user_entity on activity_log(user_id, entity_type, entity_id);

alter table activity_log enable row level security;

create policy "Users can read own activity log"
  on activity_log for select using (auth.uid() = user_id);

create policy "Users can insert own activity log"
  on activity_log for insert with check (auth.uid() = user_id);
