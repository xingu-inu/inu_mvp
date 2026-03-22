-- Add impact_area_ids to goals for cross-area relationships
-- A goal's primary area is area_id (unchanged).
-- impact_area_ids lists secondary areas this goal also serves (max 3, display only).
ALTER TABLE public.goals
ADD COLUMN impact_area_ids UUID[] DEFAULT '{}';

-- Index for queries filtering by impact area
CREATE INDEX idx_goals_impact_area_ids ON public.goals USING GIN (impact_area_ids);
