ALTER TABLE public.goals
ADD COLUMN start_date DATE DEFAULT NULL;

COMMENT ON COLUMN public.goals.start_date IS 'Goal period start date (YYYY-MM-DD). Together with target_date forms the goal period.';
