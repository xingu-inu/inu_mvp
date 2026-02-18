-- ============================================
-- Task Status System: enum, columns, data migration,
-- sync trigger, and indexes
-- ============================================

-- 1) Create task_status enum
CREATE TYPE task_status AS ENUM ('active', 'completed', 'paused');

-- 2) Add columns to tasks
ALTER TABLE public.tasks
  ADD COLUMN status task_status NOT NULL DEFAULT 'active',
  ADD COLUMN scheduled_date DATE,
  ADD COLUMN completed_at TIMESTAMPTZ,
  ADD COLUMN paused_at TIMESTAMPTZ,
  ADD COLUMN status_change_reason TEXT,
  ADD COLUMN status_change_note TEXT;

-- 3) Migrate existing data based on is_active and repeat_type
UPDATE public.tasks SET status = CASE
  WHEN is_active = TRUE THEN 'active'::task_status
  WHEN repeat_type = 'once' THEN 'completed'::task_status
  ELSE 'paused'::task_status
END;

-- 4) Backfill scheduled_date for once tasks
UPDATE public.tasks SET scheduled_date = created_at::date
WHERE repeat_type = 'once' AND scheduled_date IS NULL;

-- 5) Sync trigger: keep is_active in sync with status for backward compat
CREATE OR REPLACE FUNCTION sync_task_is_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_active = (NEW.status = 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_sync_is_active
  BEFORE INSERT OR UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION sync_task_is_active();

-- 6) Indexes
CREATE INDEX idx_tasks_status ON public.tasks(user_id, status) WHERE status = 'active';
CREATE INDEX idx_tasks_scheduled_date ON public.tasks(scheduled_date) WHERE repeat_type = 'once';
