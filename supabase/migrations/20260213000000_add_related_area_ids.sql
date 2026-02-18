-- Add related_area_ids to tasks for cross-area connections
ALTER TABLE tasks ADD COLUMN related_area_ids text[] DEFAULT '{}';
