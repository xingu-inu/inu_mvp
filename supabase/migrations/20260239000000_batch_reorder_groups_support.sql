-- ============================================
-- Fix batch_update_sort_order for groups table
-- groups has no user_id column; verify ownership via goals JOIN
-- ============================================
CREATE OR REPLACE FUNCTION batch_update_sort_order(
  p_table_name TEXT,
  p_updates JSONB
)
RETURNS void AS $$
DECLARE
  item JSONB;
  allowed_tables TEXT[] := ARRAY['areas', 'goals', 'groups', 'tasks'];
BEGIN
  -- Whitelist check: only allow known tables
  IF NOT (p_table_name = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'Invalid table name: %. Allowed: areas, goals, groups, tasks', p_table_name;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    IF p_table_name = 'groups' THEN
      -- groups has no user_id; verify ownership via goals table
      UPDATE groups
      SET sort_order = item->>'sortOrder', updated_at = NOW()
      WHERE id = (item->>'id')::UUID
        AND EXISTS (
          SELECT 1 FROM goals
          WHERE goals.id = groups.goal_id
            AND goals.user_id = auth.uid()
        );
    ELSE
      EXECUTE format(
        'UPDATE %I SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND user_id = auth.uid()',
        p_table_name
      ) USING item->>'sortOrder', (item->>'id')::UUID;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
