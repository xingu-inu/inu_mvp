-- Undo check-in: delete check-in and recalculate streak
CREATE OR REPLACE FUNCTION undo_checkin_with_streak(
  p_checkin_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_task_id UUID;
  v_date DATE;
  v_prev_streak INTEGER;
  v_new_streak INTEGER := 0;
  v_best_streak INTEGER;
  v_last_done_date DATE;
  v_consecutive DATE;
BEGIN
  -- Get check-in info and verify ownership
  SELECT ci.task_id, ci.date
  INTO v_task_id, v_date
  FROM check_ins ci
  WHERE ci.id = p_checkin_id AND ci.user_id = p_user_id;

  IF v_task_id IS NULL THEN
    RAISE EXCEPTION 'Check-in not found or not owned by user';
  END IF;

  -- Delete the check-in
  DELETE FROM check_ins WHERE id = p_checkin_id AND user_id = p_user_id;

  -- Recalculate streak: count consecutive 'done' days ending at today or latest done date
  SELECT date INTO v_last_done_date
  FROM check_ins
  WHERE task_id = v_task_id AND user_id = p_user_id AND status = 'done'
  ORDER BY date DESC
  LIMIT 1;

  IF v_last_done_date IS NOT NULL THEN
    -- Count consecutive done days backwards from the last done date
    v_consecutive := v_last_done_date;
    v_new_streak := 0;

    LOOP
      IF EXISTS (
        SELECT 1 FROM check_ins
        WHERE task_id = v_task_id AND user_id = p_user_id
          AND date = v_consecutive AND status = 'done'
      ) THEN
        v_new_streak := v_new_streak + 1;
        v_consecutive := v_consecutive - 1;
      ELSE
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- Get current best_streak (preserve — "no guilt" philosophy)
  SELECT best_streak INTO v_best_streak FROM tasks WHERE id = v_task_id;

  -- Update task streak (best_streak is NOT reduced)
  UPDATE tasks SET
    streak_count = v_new_streak,
    last_check_in_date = v_last_done_date
  WHERE id = v_task_id;

  RETURN json_build_object(
    'taskId', v_task_id,
    'newStreak', v_new_streak,
    'bestStreak', COALESCE(v_best_streak, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
