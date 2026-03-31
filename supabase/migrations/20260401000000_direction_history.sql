-- Direction 변경 히스토리 테이블
-- 타임라인에서 방향 변경 이벤트를 추적하기 위한 테이블

create table direction_history (
  id uuid primary key default gen_random_uuid(),
  direction_id uuid not null references directions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  change_type text not null,   -- 'updated', 'archived', 'activated'
  field_changed text,          -- 'statement', 'status' 등 (nullable)
  old_value text,
  new_value text,
  note text,
  created_at timestamptz not null default now()
);

create index idx_direction_history_user_created on direction_history(user_id, created_at desc);
create index idx_direction_history_direction on direction_history(direction_id);

alter table direction_history enable row level security;

create policy "Users can read own direction history"
  on direction_history for select using (auth.uid() = user_id);

create policy "Users can insert own direction history"
  on direction_history for insert with check (auth.uid() = user_id);
