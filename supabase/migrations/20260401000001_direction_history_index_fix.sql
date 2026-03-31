-- Replace simple user_id index with composite (user_id, created_at desc)
-- for efficient timeline queries with date range filtering

drop index if exists idx_direction_history_user;
create index idx_direction_history_user_created on direction_history(user_id, created_at desc);
