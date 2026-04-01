-- Timeline Notes: 사용자의 짧은 리플렉션 메모 (AI 질문에 대한 답변)
create table timeline_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  observation_key text not null,
  content text not null,
  event_context jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_timeline_notes_user_key on timeline_notes(user_id, observation_key);
create index idx_timeline_notes_user_created on timeline_notes(user_id, created_at desc);

alter table timeline_notes enable row level security;

create policy "Users can manage own timeline notes"
  on timeline_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
