-- ============================================
-- Update RPCs for Task Status System
-- Replaces: get_today_tasks, get_week_tasks,
--           create_checkin_with_streak, undo_checkin_with_streak
-- ============================================

-- ============================================
-- 1) get_today_tasks
-- ============================================
CREATE OR REPLACE FUNCTION get_today_tasks(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
SELECT COALESCE(json_agg(
  json_build_object(
    'id', t.id,
    'name', t.name,
    'why', t.why,
    'goalId', t.goal_id,
    'phaseId', t.phase_id,
    'timeSlot', t.time_slot,
    'specificTime', t.specific_time,
    'durationMinutes', t.duration_minutes,
    'streakCount', t.streak_count,
    'bestStreak', t.best_streak,
    'sortOrder', t.sort_order,
    'repeatType', t.repeat_type,
    'scheduledDate', t.scheduled_date,
    'taskStatus', t.status::text,
    'isOverdue', (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date < p_date AND p_date = CURRENT_DATE),
    'totalCompleted', (
      SELECT COUNT(*) FROM check_ins c
      WHERE c.task_id = t.id AND c.status = 'done'
    ),
    'goal', (
      SELECT json_build_object(
        'id', g.id,
        'name', g.name,
        'why', g.why,
        'areaId', g.area_id,
        'area', (
          SELECT json_build_object(
            'id', a.id,
            'name', a.name,
            'emoji', a.emoji,
            'color', a.color,
            'why', a.why
          )
          FROM areas a WHERE a.id = g.area_id
        )
      )
      FROM goals g WHERE g.id = t.goal_id
    ),
    'phase', (
      SELECT json_build_object(
        'id', p.id,
        'name', p.name,
        'why', p.why
      )
      FROM phases p WHERE p.id = t.phase_id
    ),
    'todayCheckIn', (
      SELECT json_build_object('id', c.id, 'status', c.status, 'note', c.note, 'createdAt', c.created_at)
      FROM check_ins c
      WHERE c.task_id = t.id AND c.date = p_date
    )
  ) ORDER BY t.sort_order
), '[]')
FROM tasks t
WHERE t.user_id = p_user_id
  AND (
    t.goal_id IS NULL
    OR EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = t.goal_id
      AND g.status IN ('active', 'maintenance')
    )
  )
  AND (
    -- 1) Active recurring tasks
    (t.status = 'active' AND t.repeat_type != 'once' AND (
      t.repeat_type = 'daily'
      OR (t.repeat_type = 'weekdays' AND EXTRACT(DOW FROM p_date) BETWEEN 1 AND 5)
      OR (t.repeat_type = 'weekends' AND EXTRACT(DOW FROM p_date) IN (0, 6))
      OR (t.repeat_type = 'weekly' AND EXTRACT(DOW FROM p_date) = ANY(t.repeat_days))
      OR (t.repeat_type = 'custom' AND EXTRACT(DOW FROM p_date) = ANY(t.repeat_days))
    ))
    -- 2) Active once-task on its scheduled date
    OR (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date = p_date)
    -- 3) Completed once-task on its scheduled date (show with strikethrough)
    OR (t.repeat_type = 'once' AND t.status = 'completed' AND t.scheduled_date = p_date)
    -- 4) Overdue once-task: only show on today
    OR (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date < p_date AND p_date = CURRENT_DATE)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 2) get_week_tasks
-- ============================================
CREATE OR REPLACE FUNCTION get_week_tasks(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON AS $$
SELECT json_object_agg(d.dt::date::text, COALESCE(day_tasks.tasks, '[]'::json))
FROM generate_series(p_start_date, p_end_date, '1 day'::interval) AS d(dt)
LEFT JOIN LATERAL (
  SELECT json_agg(
    json_build_object(
      'id', t.id,
      'name', t.name,
      'why', t.why,
      'goalId', t.goal_id,
      'phaseId', t.phase_id,
      'timeSlot', t.time_slot,
      'specificTime', t.specific_time,
      'durationMinutes', t.duration_minutes,
      'streakCount', t.streak_count,
      'bestStreak', t.best_streak,
      'sortOrder', t.sort_order,
      'repeatType', t.repeat_type,
      'scheduledDate', t.scheduled_date,
      'taskStatus', t.status::text,
      'isOverdue', (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date < d.dt::date AND d.dt::date = CURRENT_DATE),
      'totalCompleted', (
        SELECT COUNT(*) FROM check_ins c
        WHERE c.task_id = t.id AND c.status = 'done'
      ),
      'goal', (
        SELECT json_build_object(
          'id', g.id,
          'name', g.name,
          'why', g.why,
          'areaId', g.area_id,
          'area', (
            SELECT json_build_object(
              'id', a.id,
              'name', a.name,
              'emoji', a.emoji,
              'color', a.color,
              'why', a.why,
              'sortOrder', a.sort_order
            )
            FROM areas a WHERE a.id = g.area_id
          )
        )
        FROM goals g WHERE g.id = t.goal_id
      ),
      'phase', (
        SELECT json_build_object(
          'id', p.id,
          'name', p.name,
          'why', p.why
        )
        FROM phases p WHERE p.id = t.phase_id
      ),
      'todayCheckIn', (
        SELECT json_build_object('id', c.id, 'status', c.status, 'note', c.note, 'createdAt', c.created_at)
        FROM check_ins c
        WHERE c.task_id = t.id AND c.date = d.dt::date
      )
    ) ORDER BY t.sort_order
  ) AS tasks
  FROM tasks t
  WHERE t.user_id = p_user_id
    AND (
      t.goal_id IS NULL
      OR EXISTS (
        SELECT 1 FROM goals g
        WHERE g.id = t.goal_id
        AND g.status IN ('active', 'maintenance')
      )
    )
    AND (
      -- 1) Active recurring tasks
      (t.status = 'active' AND t.repeat_type != 'once' AND (
        t.repeat_type = 'daily'
        OR (t.repeat_type = 'weekdays' AND EXTRACT(DOW FROM d.dt) BETWEEN 1 AND 5)
        OR (t.repeat_type = 'weekends' AND EXTRACT(DOW FROM d.dt) IN (0, 6))
        OR (t.repeat_type = 'weekly' AND EXTRACT(DOW FROM d.dt) = ANY(t.repeat_days))
        OR (t.repeat_type = 'custom' AND EXTRACT(DOW FROM d.dt) = ANY(t.repeat_days))
      ))
      -- 2) Active once-task on its scheduled date
      OR (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date = d.dt::date)
      -- 3) Completed once-task on its scheduled date (show with strikethrough)
      OR (t.repeat_type = 'once' AND t.status = 'completed' AND t.scheduled_date = d.dt::date)
      -- 4) Overdue once-task: only show on today
      OR (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date < d.dt::date AND d.dt::date = CURRENT_DATE)
    )
) day_tasks ON true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 3) create_checkin_with_streak
-- ============================================
CREATE OR REPLACE FUNCTION create_checkin_with_streak(
  p_task_id UUID,
  p_user_id UUID,
  p_status checkin_status,
  p_date DATE DEFAULT CURRENT_DATE,
  p_note TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_checkin_id UUID;
  v_new_streak INTEGER;
  v_best_streak INTEGER;
  v_last_date DATE;
  v_repeat_type TEXT;
BEGIN
  -- Check-in 생성 (UPSERT)
  INSERT INTO check_ins (task_id, user_id, date, status, note)
  VALUES (p_task_id, p_user_id, p_date, p_status, p_note)
  ON CONFLICT (task_id, date) DO UPDATE SET status = p_status, note = p_note
  RETURNING id INTO v_checkin_id;

  -- Get repeat_type for conditional logic
  SELECT repeat_type INTO v_repeat_type FROM tasks WHERE id = p_task_id;

  -- Skip streak logic for once tasks
  IF v_repeat_type != 'once' THEN
    -- 스트릭 계산
    SELECT last_check_in_date, streak_count, best_streak
    INTO v_last_date, v_new_streak, v_best_streak
    FROM tasks WHERE id = p_task_id;

    IF p_status = 'done' THEN
      -- 연속 체크인 확인
      IF v_last_date = p_date - 1 OR v_last_date IS NULL THEN
        v_new_streak := COALESCE(v_new_streak, 0) + 1;
      ELSIF v_last_date != p_date THEN
        v_new_streak := 1; -- 스트릭 리셋
      END IF;

      -- 최고 스트릭 갱신
      IF v_new_streak > COALESCE(v_best_streak, 0) THEN
        v_best_streak := v_new_streak;
      END IF;

      -- Task 업데이트
      UPDATE tasks SET
        streak_count = v_new_streak,
        best_streak = v_best_streak,
        last_check_in_date = p_date
      WHERE id = p_task_id;
    END IF;
  END IF;

  -- Auto-complete once tasks on done check-in
  IF v_repeat_type = 'once' AND p_status = 'done' THEN
    UPDATE tasks SET
      status = 'completed',
      completed_at = NOW()
    WHERE id = p_task_id;
  END IF;

  RETURN json_build_object(
    'checkinId', v_checkin_id,
    'newStreak', v_new_streak,
    'bestStreak', v_best_streak
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4) undo_checkin_with_streak
-- ============================================
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

  -- Restore once tasks to active on undo
  IF (SELECT repeat_type FROM tasks WHERE id = v_task_id) = 'once' THEN
    UPDATE tasks SET
      status = 'active',
      completed_at = NULL
    WHERE id = v_task_id;
  END IF;

  RETURN json_build_object(
    'taskId', v_task_id,
    'newStreak', v_new_streak,
    'bestStreak', COALESCE(v_best_streak, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
