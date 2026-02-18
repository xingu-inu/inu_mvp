ALTER TABLE public.tasks
  ADD COLUMN cross_link_group_map JSONB DEFAULT '{}';

COMMENT ON COLUMN public.tasks.cross_link_group_map
  IS 'Cross-link group placement map. { "targetGoalId": "targetGroupId" | null }';
