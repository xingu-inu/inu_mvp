-- ============================================
-- Security Hardening: Replace p_user_id with auth.uid()
--
-- All SECURITY DEFINER RPC functions previously accepted p_user_id
-- from the caller, allowing any authenticated user to access other
-- users' data by passing a different UUID. This migration removes
-- the p_user_id parameter and uses auth.uid() directly.
-- ============================================

-- ============================================
-- 1. resolve_directions_for_date — returns ALL directions active on date
-- ============================================
CREATE OR REPLACE FUNCTION resolve_directions_for_date(p_date DATE)
RETURNS UUID[] AS $$
DECLARE
  v_dir_ids UUID[];
BEGIN
  -- Today/future: current active direction only
  IF p_date >= CURRENT_DATE THEN
    SELECT ARRAY[id] INTO v_dir_ids
    FROM directions
    WHERE user_id = auth.uid() AND status = 'active'
    LIMIT 1;
    RETURN v_dir_ids;
  END IF;

  -- Past dates: all directions that were active at some point on this date
  SELECT ARRAY_AGG(d.id) INTO v_dir_ids
  FROM directions d
  WHERE d.user_id = auth.uid()
    AND d.created_at::date <= p_date
    AND NOT EXISTS (
      SELECT 1 FROM directions d2
      WHERE d2.user_id = auth.uid()
        AND d2.version > d.version
        AND d2.created_at::date < p_date
    );

  -- Fallback: oldest direction
  IF v_dir_ids IS NULL THEN
    SELECT ARRAY[id] INTO v_dir_ids
    FROM directions
    WHERE user_id = auth.uid()
    ORDER BY version ASC
    LIMIT 1;
  END IF;

  RETURN v_dir_ids;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 2. resolve_direction_for_date — backward compat wrapper
-- ============================================
CREATE OR REPLACE FUNCTION resolve_direction_for_date(p_date DATE)
RETURNS UUID AS $$
DECLARE
  v_dir_ids UUID[];
BEGIN
  v_dir_ids := resolve_directions_for_date(p_date);
  IF v_dir_ids IS NOT NULL AND array_length(v_dir_ids, 1) > 0 THEN
    RETURN v_dir_ids[array_length(v_dir_ids, 1)];
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 3. get_today_tasks
-- ============================================
CREATE OR REPLACE FUNCTION get_today_tasks(
  p_date DATE DEFAULT CURRENT_DATE,
  p_direction_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
SELECT COALESCE(json_agg(
  json_build_object(
    'id', t.id,
    'name', t.name,
    'why', t.why,
    'goalId', t.goal_id,
    'groupId', t.group_id,
    'areaId', t.area_id,
    'timeSlot', t.time_slot,
    'specificTime', t.specific_time,
    'durationMinutes', t.duration_minutes,
    'streakCount', t.streak_count,
    'bestStreak', t.best_streak,
    'sortOrder', t.sort_order,
    'repeatType', t.repeat_type,
    'repeatDays', t.repeat_days,
    'scheduledDate', t.scheduled_date,
    'startDate', t.start_date,
    'endDate', t.end_date,
    'taskStatus', t.status::text,
    'isOverdue', (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date < p_date AND p_date = CURRENT_DATE),
    'totalCompleted', (
      SELECT COUNT(*) FROM check_ins c
      WHERE c.task_id = t.id AND c.status = 'done'
    ),
    'directionVersion', (
      CASE
        WHEN t.goal_id IS NOT NULL THEN
          (SELECT dir.version FROM goals g
           JOIN areas a ON a.id = g.area_id
           JOIN directions dir ON dir.id = a.direction_id
           WHERE g.id = t.goal_id)
        WHEN t.area_id IS NOT NULL THEN
          (SELECT dir.version FROM areas a
           JOIN directions dir ON dir.id = a.direction_id
           WHERE a.id = t.area_id)
        ELSE NULL
      END
    ),
    'relatedAreaIds', t.related_area_ids,
    'relatedAreas', (
      SELECT COALESCE(json_agg(
        json_build_object('id', ra.id, 'name', ra.name, 'emoji', ra.emoji, 'color', ra.color)
      ), '[]'::json)
      FROM areas ra WHERE ra.id = ANY(t.related_area_ids)
    ),
    'relatedGoalIds', t.related_goal_ids,
    'relatedGoals', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', rg.id, 'name', rg.name, 'areaId', rg.area_id,
          'area', (SELECT json_build_object('id', a.id, 'name', a.name, 'emoji', a.emoji, 'color', a.color)
                   FROM areas a WHERE a.id = rg.area_id)
        )
      ), '[]'::json)
      FROM goals rg WHERE rg.id = ANY(t.related_goal_ids)
    ),
    'directArea', (
      CASE WHEN t.goal_id IS NULL AND t.area_id IS NOT NULL THEN
        (SELECT json_build_object('id', da.id, 'name', da.name, 'emoji', da.emoji, 'color', da.color, 'why', da.why, 'sortOrder', da.sort_order)
         FROM areas da WHERE da.id = t.area_id)
      ELSE NULL
      END
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
    'group', (
      SELECT json_build_object(
        'id', grp.id,
        'name', grp.name,
        'why', grp.why
      )
      FROM groups grp WHERE grp.id = t.group_id
    ),
    'todayCheckIn', (
      SELECT json_build_object('id', c.id, 'status', c.status, 'note', c.note, 'createdAt', c.created_at)
      FROM check_ins c
      WHERE c.task_id = t.id AND c.date = p_date
    )
  ) ORDER BY t.sort_order
), '[]')
FROM tasks t
WHERE t.user_id = auth.uid()
  AND (
    -- Goalless + no area: always show (no version association)
    (t.goal_id IS NULL AND t.area_id IS NULL)
    -- Goalless + has area: only if area belongs to resolved/override direction
    OR (t.goal_id IS NULL AND t.area_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM areas a
      WHERE a.id = t.area_id
      AND a.direction_id = ANY(
        CASE WHEN p_direction_id IS NOT NULL
          THEN ARRAY[p_direction_id]
          ELSE resolve_directions_for_date(p_date)
        END
      )
    ))
    -- Goal-based: in resolved/override direction
    OR EXISTS (
      SELECT 1 FROM goals g
      JOIN areas a ON a.id = g.area_id
      WHERE g.id = t.goal_id
      AND a.direction_id = ANY(
        CASE WHEN p_direction_id IS NOT NULL
          THEN ARRAY[p_direction_id]
          ELSE resolve_directions_for_date(p_date)
        END
      )
      -- Relax goal status when browsing archived version
      AND (
        CASE WHEN p_direction_id IS NOT NULL THEN TRUE
        WHEN p_date >= CURRENT_DATE THEN g.status IN ('active', 'maintenance')
        ELSE TRUE END
      )
    )
    -- Once-task bypass: always show once-tasks on their scheduled date
    OR (t.repeat_type = 'once' AND t.scheduled_date = p_date)
    -- Check-in bypass: tasks with check-in records always pass direction filter
    OR EXISTS (SELECT 1 FROM check_ins c WHERE c.task_id = t.id AND c.date = p_date)
  )
  AND (
    -- 1) Active recurring tasks (with period filter)
    (t.status = 'active' AND t.repeat_type != 'once' AND (
      t.repeat_type = 'daily'
      OR (t.repeat_type = 'weekdays' AND EXTRACT(DOW FROM p_date) BETWEEN 1 AND 5)
      OR (t.repeat_type = 'weekends' AND EXTRACT(DOW FROM p_date) IN (0, 6))
      OR (t.repeat_type = 'weekly' AND EXTRACT(DOW FROM p_date) = ANY(t.repeat_days))
      OR (t.repeat_type = 'custom' AND EXTRACT(DOW FROM p_date) = ANY(t.repeat_days))
    )
      AND (t.start_date IS NULL OR t.start_date <= p_date)
      AND (t.end_date IS NULL OR t.end_date >= p_date)
    )
    -- 2) Active once-task on its scheduled date
    OR (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date = p_date)
    -- 3) Completed once-task on its scheduled date
    OR (t.repeat_type = 'once' AND t.status = 'completed' AND t.scheduled_date = p_date)
    -- 4) Overdue once-task: only show on today
    OR (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date < p_date AND p_date = CURRENT_DATE)
    -- 5) Any task with a check-in on this date (historical records)
    OR EXISTS (
      SELECT 1 FROM check_ins c
      WHERE c.task_id = t.id AND c.date = p_date
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 4. get_week_tasks
-- ============================================
CREATE OR REPLACE FUNCTION get_week_tasks(
  p_start_date DATE,
  p_end_date DATE,
  p_direction_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
SELECT json_object_agg(d.dt::date::text, COALESCE(day_tasks.tasks, '[]'::json))
FROM generate_series(p_start_date, p_end_date, '1 day'::interval) AS d(dt)
LEFT JOIN LATERAL (
  SELECT
    CASE WHEN p_direction_id IS NOT NULL
      THEN ARRAY[p_direction_id]
      ELSE resolve_directions_for_date(d.dt::date)
    END AS dir_ids
) dir_ctx ON true
LEFT JOIN LATERAL (
  SELECT json_agg(
    json_build_object(
      'id', t.id,
      'name', t.name,
      'why', t.why,
      'goalId', t.goal_id,
      'groupId', t.group_id,
      'areaId', t.area_id,
      'timeSlot', t.time_slot,
      'specificTime', t.specific_time,
      'durationMinutes', t.duration_minutes,
      'streakCount', t.streak_count,
      'bestStreak', t.best_streak,
      'sortOrder', t.sort_order,
      'repeatType', t.repeat_type,
      'repeatDays', t.repeat_days,
      'scheduledDate', t.scheduled_date,
      'startDate', t.start_date,
      'endDate', t.end_date,
      'taskStatus', t.status::text,
      'isOverdue', (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date < d.dt::date AND d.dt::date = CURRENT_DATE),
      'totalCompleted', (
        SELECT COUNT(*) FROM check_ins c
        WHERE c.task_id = t.id AND c.status = 'done'
      ),
      'directionVersion', (
        CASE
          WHEN t.goal_id IS NOT NULL THEN
            (SELECT dir.version FROM goals g
             JOIN areas a ON a.id = g.area_id
             JOIN directions dir ON dir.id = a.direction_id
             WHERE g.id = t.goal_id)
          WHEN t.area_id IS NOT NULL THEN
            (SELECT dir.version FROM areas a
             JOIN directions dir ON dir.id = a.direction_id
             WHERE a.id = t.area_id)
          ELSE NULL
        END
      ),
      'relatedAreaIds', t.related_area_ids,
      'relatedAreas', (
        SELECT COALESCE(json_agg(
          json_build_object('id', ra.id, 'name', ra.name, 'emoji', ra.emoji, 'color', ra.color)
        ), '[]'::json)
        FROM areas ra WHERE ra.id = ANY(t.related_area_ids)
      ),
      'relatedGoalIds', t.related_goal_ids,
      'relatedGoals', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', rg.id, 'name', rg.name, 'areaId', rg.area_id,
            'area', (SELECT json_build_object('id', a.id, 'name', a.name, 'emoji', a.emoji, 'color', a.color)
                     FROM areas a WHERE a.id = rg.area_id)
          )
        ), '[]'::json)
        FROM goals rg WHERE rg.id = ANY(t.related_goal_ids)
      ),
      'directArea', (
        CASE WHEN t.goal_id IS NULL AND t.area_id IS NOT NULL THEN
          (SELECT json_build_object('id', da.id, 'name', da.name, 'emoji', da.emoji, 'color', da.color, 'why', da.why, 'sortOrder', da.sort_order)
           FROM areas da WHERE da.id = t.area_id)
        ELSE NULL
        END
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
      'group', (
        SELECT json_build_object(
          'id', grp.id,
          'name', grp.name,
          'why', grp.why
        )
        FROM groups grp WHERE grp.id = t.group_id
      ),
      'todayCheckIn', (
        SELECT json_build_object('id', c.id, 'status', c.status, 'note', c.note, 'createdAt', c.created_at)
        FROM check_ins c
        WHERE c.task_id = t.id AND c.date = d.dt::date
      )
    ) ORDER BY t.sort_order
  ) AS tasks
  FROM tasks t
  WHERE t.user_id = auth.uid()
    AND (
      -- Goalless + no area → always show (no version association)
      (t.goal_id IS NULL AND t.area_id IS NULL)
      -- Goalless + has area → only if area belongs to resolved/override direction
      OR (t.goal_id IS NULL AND t.area_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM areas a
        WHERE a.id = t.area_id AND a.direction_id = ANY(dir_ctx.dir_ids)
      ))
      -- Goal-based → in resolved/override direction
      OR EXISTS (
        SELECT 1 FROM goals g
        JOIN areas a ON a.id = g.area_id
        WHERE g.id = t.goal_id
        AND a.direction_id = ANY(dir_ctx.dir_ids)
        -- Relax goal status when browsing archived version
        AND (
          CASE WHEN p_direction_id IS NOT NULL THEN TRUE
          WHEN d.dt::date >= CURRENT_DATE THEN g.status IN ('active', 'maintenance')
          ELSE TRUE END
        )
      )
      -- Once-task bypass: always show once-tasks on their scheduled date
      OR (t.repeat_type = 'once' AND t.scheduled_date = d.dt::date)
      -- Check-in bypass: tasks with check-in records always pass direction filter
      OR EXISTS (SELECT 1 FROM check_ins c WHERE c.task_id = t.id AND c.date = d.dt::date)
    )
    AND (
      -- 1) Active recurring tasks (with period filter)
      (t.status = 'active' AND t.repeat_type != 'once' AND (
        t.repeat_type = 'daily'
        OR (t.repeat_type = 'weekdays' AND EXTRACT(DOW FROM d.dt) BETWEEN 1 AND 5)
        OR (t.repeat_type = 'weekends' AND EXTRACT(DOW FROM d.dt) IN (0, 6))
        OR (t.repeat_type = 'weekly' AND EXTRACT(DOW FROM d.dt) = ANY(t.repeat_days))
        OR (t.repeat_type = 'custom' AND EXTRACT(DOW FROM d.dt) = ANY(t.repeat_days))
      )
        AND (t.start_date IS NULL OR t.start_date <= d.dt::date)
        AND (t.end_date IS NULL OR t.end_date >= d.dt::date)
      )
      -- 2) Active once-task on its scheduled date
      OR (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date = d.dt::date)
      -- 3) Completed once-task on its scheduled date
      OR (t.repeat_type = 'once' AND t.status = 'completed' AND t.scheduled_date = d.dt::date)
      -- 4) Overdue once-task: only show on today
      OR (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date < d.dt::date AND d.dt::date = CURRENT_DATE)
      -- 5) Any task with a check-in on this date (historical records)
      OR EXISTS (
        SELECT 1 FROM check_ins c
        WHERE c.task_id = t.id AND c.date = d.dt::date
      )
    )
) day_tasks ON true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 5. get_today_dashboard
-- ============================================
CREATE OR REPLACE FUNCTION get_today_dashboard()
RETURNS JSON AS $$
SELECT json_build_object(
  'tasks', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', t.id,
        'name', t.name,
        'goalId', t.goal_id,
        'timeSlot', t.time_slot,
        'durationMinutes', t.duration_minutes,
        'streakCount', t.streak_count,
        'sortOrder', t.sort_order,
        'todayCheckIn', (
          SELECT json_build_object('status', c.status, 'note', c.note)
          FROM check_ins c
          WHERE c.task_id = t.id AND c.date = CURRENT_DATE
        )
      ) ORDER BY t.sort_order
    ), '[]')
    FROM tasks t
    WHERE t.user_id = auth.uid()
      AND t.is_active = TRUE
      AND (
        t.repeat_type = 'daily'
        OR (t.repeat_type = 'weekdays' AND EXTRACT(DOW FROM CURRENT_DATE) BETWEEN 1 AND 5)
        OR (t.repeat_type = 'weekends' AND EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6))
        OR (t.repeat_type = 'custom' AND EXTRACT(DOW FROM CURRENT_DATE) = ANY(t.repeat_days))
      )
  ),
  'stats', (
    SELECT json_build_object(
      'completedToday', (
        SELECT COUNT(*) FROM check_ins c
        WHERE c.user_id = auth.uid()
        AND c.date = CURRENT_DATE
        AND c.status = 'done'
      ),
      'totalToday', (
        SELECT COUNT(*) FROM tasks t
        WHERE t.user_id = auth.uid()
        AND t.is_active = TRUE
      ),
      'currentStreak', COALESCE((
        SELECT MAX(t.streak_count) FROM tasks t
        WHERE t.user_id = auth.uid() AND t.is_active = TRUE
      ), 0)
    )
  ),
  'recentCheckins', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', c.id,
        'taskId', c.task_id,
        'status', c.status,
        'note', c.note,
        'createdAt', c.created_at
      ) ORDER BY c.created_at DESC
    ), '[]')
    FROM check_ins c
    WHERE c.user_id = auth.uid()
    AND c.date = CURRENT_DATE
    LIMIT 20
  )
);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 6. get_roadmap_data
-- ============================================
CREATE OR REPLACE FUNCTION get_roadmap_data()
RETURNS JSON AS $$
SELECT json_build_object(
  'directions', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', d.id,
        'statement', d.statement,
        'why', d.why,
        'createdAt', d.created_at
      )
    ), '[]')
    FROM directions d WHERE d.user_id = auth.uid()
  ),
  'areas', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', a.id,
        'name', a.name,
        'type', a.type,
        'emoji', a.emoji,
        'color', a.color,
        'sortOrder', a.sort_order,
        'isActive', a.is_active
      ) ORDER BY a.sort_order
    ), '[]')
    FROM areas a WHERE a.user_id = auth.uid() AND a.is_active = TRUE
  ),
  'goals', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', g.id,
        'name', g.name,
        'areaId', g.area_id,
        'status', g.status,
        'targetDate', g.target_date,
        'sortOrder', g.sort_order,
        'taskCount', (SELECT COUNT(*) FROM tasks t WHERE t.goal_id = g.id AND t.is_active = TRUE),
        'completedTaskCount', (
          SELECT COUNT(*) FROM tasks t
          JOIN check_ins c ON c.task_id = t.id
          WHERE t.goal_id = g.id AND c.date = CURRENT_DATE AND c.status = 'done'
        )
      ) ORDER BY g.sort_order
    ), '[]')
    FROM goals g WHERE g.user_id = auth.uid() AND g.status != 'archived'
  )
);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 7. get_weekly_stats
-- ============================================
CREATE OR REPLACE FUNCTION get_weekly_stats(
  p_week_start DATE
)
RETURNS JSON AS $$
SELECT json_build_object(
  'totalTasks', (
    SELECT COUNT(DISTINCT c.task_id)
    FROM check_ins c
    WHERE c.user_id = auth.uid()
      AND c.date >= p_week_start
      AND c.date < p_week_start + INTERVAL '7 days'
  ),
  'completedCount', (
    SELECT COUNT(*)
    FROM check_ins c
    WHERE c.user_id = auth.uid()
      AND c.date >= p_week_start
      AND c.date < p_week_start + INTERVAL '7 days'
      AND c.status = 'done'
  ),
  'skippedCount', (
    SELECT COUNT(*)
    FROM check_ins c
    WHERE c.user_id = auth.uid()
      AND c.date >= p_week_start
      AND c.date < p_week_start + INTERVAL '7 days'
      AND c.status = 'skip'
  ),
  'dailyBreakdown', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'date', d.date,
        'done', d.done_count,
        'skip', d.skip_count
      ) ORDER BY d.date
    ), '[]')
    FROM (
      SELECT
        c.date,
        COUNT(*) FILTER (WHERE c.status = 'done') as done_count,
        COUNT(*) FILTER (WHERE c.status = 'skip') as skip_count
      FROM check_ins c
      WHERE c.user_id = auth.uid()
        AND c.date >= p_week_start
        AND c.date < p_week_start + INTERVAL '7 days'
      GROUP BY c.date
    ) d
  ),
  'areaBreakdown', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'areaId', a.area_id,
        'areaName', ar.name,
        'done', a.done_count,
        'total', a.total_count
      )
    ), '[]')
    FROM (
      SELECT
        g.area_id,
        COUNT(*) FILTER (WHERE c.status = 'done') as done_count,
        COUNT(*) as total_count
      FROM check_ins c
      JOIN tasks t ON t.id = c.task_id
      JOIN goals g ON g.id = t.goal_id
      WHERE c.user_id = auth.uid()
        AND c.date >= p_week_start
        AND c.date < p_week_start + INTERVAL '7 days'
      GROUP BY g.area_id
    ) a
    JOIN areas ar ON ar.id = a.area_id
  )
);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 8. create_checkin_with_streak
-- ============================================
CREATE OR REPLACE FUNCTION create_checkin_with_streak(
  p_task_id UUID,
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
  VALUES (p_task_id, auth.uid(), p_date, p_status, p_note)
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

      -- Task 업데이트 (with user_id check)
      UPDATE tasks SET
        streak_count = v_new_streak,
        best_streak = v_best_streak,
        last_check_in_date = p_date
      WHERE id = p_task_id AND user_id = auth.uid();
    END IF;
  END IF;

  -- Auto-complete once tasks on done check-in
  IF v_repeat_type = 'once' AND p_status = 'done' THEN
    UPDATE tasks SET
      status = 'completed',
      completed_at = NOW()
    WHERE id = p_task_id AND user_id = auth.uid();
  END IF;

  RETURN json_build_object(
    'checkinId', v_checkin_id,
    'newStreak', v_new_streak,
    'bestStreak', v_best_streak
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. undo_checkin_with_streak
-- ============================================
CREATE OR REPLACE FUNCTION undo_checkin_with_streak(
  p_checkin_id UUID
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
  -- Get check-in info and verify ownership via auth.uid()
  SELECT ci.task_id, ci.date
  INTO v_task_id, v_date
  FROM check_ins ci
  WHERE ci.id = p_checkin_id AND ci.user_id = auth.uid();

  IF v_task_id IS NULL THEN
    RAISE EXCEPTION 'Check-in not found or not owned by user';
  END IF;

  -- Delete the check-in
  DELETE FROM check_ins WHERE id = p_checkin_id AND user_id = auth.uid();

  -- Recalculate streak: count consecutive 'done' days ending at today or latest done date
  SELECT date INTO v_last_done_date
  FROM check_ins
  WHERE task_id = v_task_id AND user_id = auth.uid() AND status = 'done'
  ORDER BY date DESC
  LIMIT 1;

  IF v_last_done_date IS NOT NULL THEN
    -- Count consecutive done days backwards from the last done date
    v_consecutive := v_last_done_date;
    v_new_streak := 0;

    LOOP
      IF EXISTS (
        SELECT 1 FROM check_ins
        WHERE task_id = v_task_id AND user_id = auth.uid()
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
  WHERE id = v_task_id AND user_id = auth.uid();

  -- Restore once tasks to active on undo
  IF (SELECT repeat_type FROM tasks WHERE id = v_task_id) = 'once' THEN
    UPDATE tasks SET
      status = 'active',
      completed_at = NULL
    WHERE id = v_task_id AND user_id = auth.uid();
  END IF;

  RETURN json_build_object(
    'taskId', v_task_id,
    'newStreak', v_new_streak,
    'bestStreak', COALESCE(v_best_streak, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. complete_onboarding
-- ============================================
CREATE OR REPLACE FUNCTION complete_onboarding(
  p_direction JSONB,
  p_areas JSONB,
  p_first_goal JSONB DEFAULT NULL,
  p_first_task JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_direction_id UUID;
  v_first_area_id UUID;
  v_goal_id UUID;
  v_area_id UUID;
  v_goal_rec RECORD;
  v_task_rec RECORD;
  v_goal_idx INT := 0;
  v_task_idx INT := 0;
  v_task_goal_id UUID;
  v_goal_name TEXT;
BEGIN
  -- 1. Direction: 기존 active direction이 있으면 업데이트, 없으면 생성
  SELECT id INTO v_direction_id
  FROM directions
  WHERE user_id = auth.uid() AND status = 'active';

  IF v_direction_id IS NOT NULL THEN
    UPDATE directions
    SET statement = p_direction->>'statement',
        why = p_direction->>'why',
        updated_at = NOW()
    WHERE id = v_direction_id;
  ELSE
    INSERT INTO directions (user_id, statement, why, status, version)
    VALUES (
      auth.uid(),
      p_direction->>'statement',
      p_direction->>'why',
      'active',
      1
    )
    RETURNING id INTO v_direction_id;
  END IF;

  -- 2. Areas 생성 (direction_id 포함)
  WITH inserted_areas AS (
    INSERT INTO areas (user_id, direction_id, name, type, emoji, color, sort_order)
    SELECT
      auth.uid(),
      v_direction_id,
      (area->>'name'),
      (area->>'type')::area_type,
      (area->>'emoji'),
      (area->>'color'),
      (area->>'sortOrder')
    FROM jsonb_array_elements(p_areas) AS area
    RETURNING id, sort_order
  )
  SELECT id INTO v_first_area_id
  FROM inserted_areas
  ORDER BY sort_order
  LIMIT 1;

  -- 3. Goals/Tasks 처리
  IF p_first_goal IS NOT NULL THEN
    IF jsonb_typeof(p_first_goal) = 'array' THEN
      -- === V3 배열 모드: goals 배열 순회 ===
      FOR v_goal_rec IN SELECT value FROM jsonb_array_elements(p_first_goal) LOOP
        v_area_id := NULL;
        SELECT id INTO v_area_id FROM areas
          WHERE user_id = auth.uid()
            AND direction_id = v_direction_id
            AND type = (v_goal_rec.value->>'areaType')::area_type
          ORDER BY sort_order
          LIMIT 1;

        INSERT INTO goals (user_id, area_id, name, why, status, sort_order)
        VALUES (
          auth.uid(),
          COALESCE(v_area_id, v_first_area_id),
          v_goal_rec.value->>'name',
          v_goal_rec.value->>'why',
          COALESCE(v_goal_rec.value->>'status', 'active')::goal_status,
          'a' || v_goal_idx
        )
        RETURNING id INTO v_goal_id;

        v_goal_idx := v_goal_idx + 1;
      END LOOP;

      -- V3 Tasks 배열 처리
      IF p_first_task IS NOT NULL AND jsonb_typeof(p_first_task) = 'array' THEN
        FOR v_task_rec IN SELECT value FROM jsonb_array_elements(p_first_task) LOOP
          v_goal_name := v_task_rec.value->>'goalName';

          IF v_goal_name IS NOT NULL AND v_goal_name <> '' THEN
            v_task_goal_id := NULL;
            SELECT g.id INTO v_task_goal_id FROM goals g
              WHERE g.user_id = auth.uid()
                AND g.name = v_goal_name
              ORDER BY g.sort_order
              LIMIT 1;

            IF v_task_goal_id IS NOT NULL THEN
              INSERT INTO tasks (user_id, goal_id, name, repeat_type, time_slot, sort_order)
              VALUES (
                auth.uid(),
                v_task_goal_id,
                v_task_rec.value->>'name',
                'daily',
                'anytime',
                'a' || v_task_idx
              );
              v_task_idx := v_task_idx + 1;
            END IF;
          END IF;
        END LOOP;
      END IF;

    ELSIF p_first_goal->>'name' IS NOT NULL THEN
      -- === V2 단일 goal 모드 (기존 로직 유지) ===
      INSERT INTO goals (user_id, area_id, name, why, status)
      VALUES (
        auth.uid(),
        v_first_area_id,
        p_first_goal->>'name',
        p_first_goal->>'why',
        'active'
      )
      RETURNING id INTO v_goal_id;

      IF p_first_task IS NOT NULL AND p_first_task->>'name' IS NOT NULL AND v_goal_id IS NOT NULL THEN
        INSERT INTO tasks (user_id, goal_id, name, repeat_type, time_slot, sort_order)
        VALUES (
          auth.uid(),
          v_goal_id,
          p_first_task->>'name',
          'daily',
          'anytime',
          'a0'
        );
      END IF;
    END IF;
  END IF;

  -- 5. 프로필 온보딩 완료 표시
  UPDATE profiles
  SET onboarding_completed = TRUE
  WHERE id = auth.uid();

  RETURN json_build_object(
    'directionId', v_direction_id,
    'firstAreaId', v_first_area_id,
    'firstGoalId', v_goal_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. get_direction_history
-- ============================================
CREATE OR REPLACE FUNCTION get_direction_history()
RETURNS JSON AS $$
SELECT COALESCE(json_agg(
  json_build_object(
    'id', d.id,
    'statement', d.statement,
    'why', d.why,
    'name', d.name,
    'version', d.version,
    'status', d.status::text,
    'createdAt', d.created_at,
    'archivedAt', d.archived_at,
    'goalCount', (
      SELECT COUNT(*) FROM goals g
      JOIN areas a ON a.id = g.area_id
      WHERE a.direction_id = d.id
    ),
    'areaCount', (
      SELECT COUNT(*) FROM areas a WHERE a.direction_id = d.id
    )
  ) ORDER BY d.version DESC
), '[]')
FROM directions d
WHERE d.user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 12. get_archived_roadmap
-- ============================================
CREATE OR REPLACE FUNCTION get_archived_roadmap(
  p_direction_id UUID
)
RETURNS JSON AS $$
SELECT json_build_object(
  'direction', (
    SELECT json_build_object(
      'id', d.id, 'statement', d.statement, 'why', d.why,
      'name', d.name, 'version', d.version, 'status', d.status::text,
      'createdAt', d.created_at, 'archivedAt', d.archived_at
    )
    FROM directions d
    WHERE d.id = p_direction_id AND d.user_id = auth.uid()
  ),
  'areas', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', a.id, 'name', a.name, 'emoji', a.emoji, 'color', a.color,
        'type', a.type, 'why', a.why, 'sortOrder', a.sort_order, 'isActive', a.is_active
      ) ORDER BY a.sort_order
    ), '[]')
    FROM areas a
    WHERE a.direction_id = p_direction_id AND a.user_id = auth.uid()
  ),
  'goals', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', g.id, 'name', g.name, 'areaId', g.area_id,
        'status', g.status::text, 'why', g.why, 'vision', g.vision,
        'targetDate', g.target_date, 'sortOrder', g.sort_order,
        'groups', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', gr.id, 'name', gr.name, 'why', gr.why,
              'isCompleted', gr.is_completed
            ) ORDER BY gr.sort_order
          ), '[]')
          FROM groups gr WHERE gr.goal_id = g.id
        ),
        'tasks', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', tk.id, 'name', tk.name, 'why', tk.why,
              'groupId', tk.group_id,
              'repeatType', tk.repeat_type::text,
              'timeSlot', tk.time_slot::text,
              'durationMinutes', tk.duration_minutes,
              'status', tk.status::text
            ) ORDER BY tk.sort_order
          ), '[]')
          FROM tasks tk WHERE tk.goal_id = g.id
        ),
        'taskCount', (SELECT COUNT(*) FROM tasks tk WHERE tk.goal_id = g.id)
      ) ORDER BY g.sort_order
    ), '[]')
    FROM goals g
    JOIN areas a ON a.id = g.area_id
    WHERE a.direction_id = p_direction_id AND g.user_id = auth.uid()
  )
);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 13. delete_archived_roadmap
-- ============================================
CREATE OR REPLACE FUNCTION delete_archived_roadmap(
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
  WHERE id = p_direction_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Direction not found';
  END IF;

  IF v_direction.status != 'archived' THEN
    RAISE EXCEPTION 'Cannot delete active direction';
  END IF;

  -- 2) Explicitly delete tasks (goal_id ON DELETE SET NULL would orphan them)
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

-- ============================================
-- 14. create_new_roadmap_version
-- ============================================
CREATE OR REPLACE FUNCTION create_new_roadmap_version(
  p_statement TEXT,
  p_why TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_carry_over_goal_ids UUID[] DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
  v_old_direction_id UUID;
  v_old_version INTEGER;
  v_new_direction_id UUID;
  v_new_version INTEGER;
  v_goal RECORD;
  v_new_area_id UUID;
  v_new_goal_id UUID;
  v_new_group_id UUID;
  v_group_rec RECORD;
  v_area_map JSONB := '{}';
  v_copied_count INTEGER := 0;
BEGIN
  -- 1. 현재 active direction 잠금
  SELECT id, version INTO v_old_direction_id, v_old_version
  FROM directions
  WHERE user_id = auth.uid() AND status = 'active'
  FOR UPDATE;

  IF v_old_direction_id IS NULL THEN
    RAISE EXCEPTION 'No active direction found';
  END IF;

  v_new_version := v_old_version + 1;

  -- 2. 기존 direction 아카이브
  UPDATE directions
  SET status = 'archived',
      archived_at = NOW(),
      updated_at = NOW()
  WHERE id = v_old_direction_id;

  -- 3. 새 direction 생성
  INSERT INTO directions (user_id, statement, why, name, status, version)
  VALUES (auth.uid(), p_statement, p_why, p_name, 'active', v_new_version)
  RETURNING id INTO v_new_direction_id;

  -- 4. 선택한 goal들을 deep copy
  FOR v_goal IN
    SELECT g.*
    FROM goals g
    WHERE g.id = ANY(p_carry_over_goal_ids)
      AND g.user_id = auth.uid()
  LOOP
    -- 4a. Area 복사 (아직 매핑 안 된 경우만)
    IF NOT (v_area_map ? v_goal.area_id::text) THEN
      INSERT INTO areas (user_id, direction_id, name, type, emoji, color, why, sort_order, is_active)
      SELECT user_id, v_new_direction_id, name, type, emoji, color, why, sort_order, is_active
      FROM areas WHERE id = v_goal.area_id
      RETURNING id INTO v_new_area_id;

      v_area_map := v_area_map || jsonb_build_object(v_goal.area_id::text, v_new_area_id::text);
    ELSE
      v_new_area_id := (v_area_map ->> v_goal.area_id::text)::UUID;
    END IF;

    -- 4b. Goal 복사 (active 상태로 리셋)
    INSERT INTO goals (user_id, area_id, name, why, vision, status, target_date, sort_order)
    VALUES (auth.uid(), v_new_area_id, v_goal.name, v_goal.why, v_goal.vision,
            'active', v_goal.target_date, v_goal.sort_order)
    RETURNING id INTO v_new_goal_id;

    -- 4c. Group 복사
    FOR v_group_rec IN
      SELECT * FROM groups WHERE goal_id = v_goal.id ORDER BY sort_order
    LOOP
      INSERT INTO groups (goal_id, name, why, description, is_completed, sort_order)
      VALUES (v_new_goal_id, v_group_rec.name, v_group_rec.why, v_group_rec.description,
              FALSE, v_group_rec.sort_order)
      RETURNING id INTO v_new_group_id;

      -- 4d. Group 내 Task 복사
      INSERT INTO tasks (
        user_id, goal_id, group_id, name, why,
        repeat_type, repeat_days, duration_minutes, time_slot, specific_time,
        streak_count, best_streak, is_active, status, sort_order,
        start_date, end_date, cross_link_group_map
      )
      SELECT
        user_id, v_new_goal_id, v_new_group_id, name, why,
        repeat_type, repeat_days, duration_minutes, time_slot, specific_time,
        0, best_streak, TRUE, 'active', sort_order,
        CURRENT_DATE, NULL, '{}'::jsonb
      FROM tasks
      WHERE goal_id = v_goal.id AND group_id = v_group_rec.id AND user_id = auth.uid();
    END LOOP;

    -- 4e. Group 없는 Task 복사
    INSERT INTO tasks (
      user_id, goal_id, group_id, name, why,
      repeat_type, repeat_days, duration_minutes, time_slot, specific_time,
      streak_count, best_streak, is_active, status, sort_order,
      start_date, end_date, cross_link_group_map
    )
    SELECT
      user_id, v_new_goal_id, NULL, name, why,
      repeat_type, repeat_days, duration_minutes, time_slot, specific_time,
      0, best_streak, TRUE, 'active', sort_order,
      CURRENT_DATE, NULL, '{}'::jsonb
    FROM tasks
    WHERE goal_id = v_goal.id AND group_id IS NULL AND user_id = auth.uid();

    v_copied_count := v_copied_count + 1;
  END LOOP;

  RETURN json_build_object(
    'newDirectionId', v_new_direction_id,
    'newVersion', v_new_version,
    'archivedDirectionId', v_old_direction_id,
    'copiedGoalCount', v_copied_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 15. get_reason_counts
-- ============================================
CREATE OR REPLACE FUNCTION get_reason_counts(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(reason TEXT, entity_count BIGINT, entity_type TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT reason, COUNT(*) as entity_count, 'goal'::TEXT as entity_type
  FROM goal_status_history
  WHERE user_id = auth.uid()
    AND created_at >= p_start_date
    AND created_at < p_end_date + INTERVAL '1 day'
    AND reason IS NOT NULL
  GROUP BY reason
  UNION ALL
  SELECT reason, COUNT(*) as entity_count, 'task'::TEXT as entity_type
  FROM task_status_history
  WHERE user_id = auth.uid()
    AND created_at >= p_start_date
    AND created_at < p_end_date + INTERVAL '1 day'
    AND reason IS NOT NULL
  GROUP BY reason
$$;

-- ============================================
-- 16. reset_missed_streaks — restrict to service_role only
-- ============================================
CREATE OR REPLACE FUNCTION reset_missed_streaks()
RETURNS void AS $$
BEGIN
  -- Only allow service_role (cron jobs) to call this function
  -- auth.uid() is NULL for service_role calls
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: only service_role can call reset_missed_streaks';
  END IF;

  UPDATE tasks
  SET streak_count = 0
  WHERE is_active = TRUE
    AND repeat_type = 'daily'
    AND last_check_in_date < CURRENT_DATE - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Drop old function signatures with p_user_id to avoid overload ambiguity
-- PostgreSQL keeps both old (with p_user_id) and new (without) as overloads.
-- We must explicitly drop the old signatures.
-- ============================================
DROP FUNCTION IF EXISTS resolve_directions_for_date(UUID, DATE);
DROP FUNCTION IF EXISTS resolve_direction_for_date(UUID, DATE);
DROP FUNCTION IF EXISTS get_today_tasks(UUID, DATE, UUID);
DROP FUNCTION IF EXISTS get_today_tasks(UUID, DATE);
DROP FUNCTION IF EXISTS get_week_tasks(UUID, DATE, DATE, UUID);
DROP FUNCTION IF EXISTS get_week_tasks(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_today_dashboard(UUID);
DROP FUNCTION IF EXISTS get_roadmap_data(UUID);
DROP FUNCTION IF EXISTS get_weekly_stats(UUID, DATE);
DROP FUNCTION IF EXISTS create_checkin_with_streak(UUID, UUID, checkin_status, DATE, TEXT);
DROP FUNCTION IF EXISTS undo_checkin_with_streak(UUID, UUID);
DROP FUNCTION IF EXISTS complete_onboarding(UUID, JSONB, JSONB, JSONB, JSONB);
DROP FUNCTION IF EXISTS get_direction_history(UUID);
DROP FUNCTION IF EXISTS get_archived_roadmap(UUID, UUID);
DROP FUNCTION IF EXISTS delete_archived_roadmap(UUID, UUID);
DROP FUNCTION IF EXISTS create_new_roadmap_version(UUID, TEXT, TEXT, TEXT, UUID[]);
DROP FUNCTION IF EXISTS get_reason_counts(UUID, DATE, DATE);
