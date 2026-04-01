-- AI Observations: DB-persisted cache for timeline AI observations
-- Enables instant display on Record tab visit (no cold-start delay)

create table ai_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nodes jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  data_hash text,
  created_at timestamptz not null default now()
);

-- Each user has at most one active observation set
create unique index idx_ai_observations_user on ai_observations(user_id);

-- RLS
alter table ai_observations enable row level security;

create policy "Users can read own observations"
  on ai_observations for select using (auth.uid() = user_id);

create policy "Users can insert own observations"
  on ai_observations for insert with check (auth.uid() = user_id);

create policy "Users can update own observations"
  on ai_observations for update using (auth.uid() = user_id);

create policy "Users can delete own observations"
  on ai_observations for delete using (auth.uid() = user_id);
