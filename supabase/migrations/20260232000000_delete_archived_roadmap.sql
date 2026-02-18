-- Delete an archived roadmap version (direction + all associated data)
-- tasks.goal_id uses ON DELETE SET NULL, so tasks must be explicitly deleted first

CREATE OR REPLACE FUNCTION delete_archived_roadmap(
  p_user_id UUID,
  p_direction_id UUID
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_direction RECORD;
  v_deleted_task_count INT;
  v_deleted_goal_count INT;
  v_deleted_area_count INT;
BEGIN
  -- 1) Lock & validate: must be archived + owned by user
  SELECT id, version, status INTO v_direction
  FROM directions
  WHERE id = p_direction_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Direction not found';
  END IF;

  IF v_direction.status != 'archived' THEN
    RAISE EXCEPTION 'Cannot delete active direction';
  END IF;

  -- 2) Explicitly delete tasks (goal_id ON DELETE SET NULL would orphan them)
  --    check_ins cascade from tasks (task_id ON DELETE CASCADE)
  DELETE FROM tasks WHERE goal_id IN (
    SELECT g.id FROM goals g
    JOIN areas a ON a.id = g.area_id
    WHERE a.direction_id = p_direction_id
  );
  GET DIAGNOSTICS v_deleted_task_count = ROW_COUNT;

  -- 3) Count goals/areas before cascade delete
  SELECT COUNT(*) INTO v_deleted_goal_count
  FROM goals g JOIN areas a ON a.id = g.area_id
  WHERE a.direction_id = p_direction_id;

  SELECT COUNT(*) INTO v_deleted_area_count
  FROM areas WHERE direction_id = p_direction_id;

  -- 4) Delete direction (cascades: direction → areas → goals → groups)
  DELETE FROM directions WHERE id = p_direction_id;

  RETURN json_build_object(
    'deletedDirectionId', p_direction_id,
    'deletedVersion', v_direction.version,
    'deletedAreaCount', v_deleted_area_count,
    'deletedGoalCount', v_deleted_goal_count,
    'deletedTaskCount', v_deleted_task_count
  );
END;
$$;
