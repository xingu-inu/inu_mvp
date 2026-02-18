-- ============================================
-- Fix: Past-date direction resolution shows only one version
--
-- Problem: resolve_direction_for_date() returns a single UUID
-- and relies on archived_at::date which has timezone issues.
-- Only the immediately previous version (e.g. v3 when v4 active)
-- shows up; older versions (v2, v1) are invisible.
--
-- Solution:
-- 1) New resolve_directions_for_date() returning UUID[] —
--    all directions active on a given date (handles same-day
--    version transitions like v1→v2→v3)
-- 2) Update resolve_direction_for_date() to delegate (backward compat)
-- 3) Both RPCs: = ANY(...) for direction filter, per-task
--    directionVersion, check-in bypass in direction filter
-- 4) Composite index for check-in lookups
-- ============================================

-- 0) Performance index
CREATE INDEX IF NOT EXISTS idx_check_ins_task_date
  ON public.check_ins(task_id, date);

-- 1) resolve_directions_for_date — returns ALL directions active on date
CREATE OR REPLACE FUNCTION resolve_directions_for_date(p_user_id UUID, p_date DATE)
RETURNS UUID[] AS $$
DECLARE
  v_dir_ids UUID[];
BEGIN
  -- Today/future: current active direction only
  IF p_date >= CURRENT_DATE THEN
    SELECT ARRAY[id] INTO v_dir_ids
    FROM directions
    WHERE user_id = p_user_id AND status = 'active'
    LIMIT 1;
    RETURN v_dir_ids;
  END IF;

  -- Past dates: all directions that were active at some point on this date
  -- A direction was active on date D if:
  --   - it was created on or before D
  --   - AND no later version was created strictly before D
  --     (if a later version was created ON D, both were active that day)
  SELECT ARRAY_AGG(d.id) INTO v_dir_ids
  FROM directions d
  WHERE d.user_id = p_user_id
    AND d.created_at::date <= p_date
    AND NOT EXISTS (
      SELECT 1 FROM directions d2
      WHERE d2.user_id = p_user_id
        AND d2.version > d.version
        AND d2.created_at::date < p_date
    );

  -- Fallback: oldest direction
  IF v_dir_ids IS NULL THEN
    SELECT ARRAY[id] INTO v_dir_ids
    FROM directions
    WHERE user_id = p_user_id
    ORDER BY version ASC
    LIMIT 1;
  END IF;

  RETURN v_dir_ids;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2) Update resolve_direction_for_date — delegate to plural version (backward compat)
CREATE OR REPLACE FUNCTION resolve_direction_for_date(p_user_id UUID, p_date DATE)
RETURNS UUID AS $$
DECLARE
  v_dir_ids UUID[];
BEGIN
  v_dir_ids := resolve_directions_for_date(p_user_id, p_date);
  IF v_dir_ids IS NOT NULL AND array_length(v_dir_ids, 1) > 0 THEN
    -- Return the highest-version direction (last element after AGG)
    RETURN v_dir_ids[array_length(v_dir_ids, 1)];
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3) get_today_tasks — multi-direction + per-task directionVersion + check-in bypass
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
            'why', a.why
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
WHERE t.user_id = p_user_id
  AND (
    -- Goalless + no area → always show (no version association)
    (t.goal_id IS NULL AND t.area_id IS NULL)
    -- Goalless + has area → only if area belongs to any resolved direction
    OR (t.goal_id IS NULL AND t.area_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM areas a
      WHERE a.id = t.area_id AND a.direction_id = ANY(resolve_directions_for_date(p_user_id, p_date))
    ))
    -- Goal-based → in any resolved direction, with status filter only for today/future
    OR EXISTS (
      SELECT 1 FROM goals g
      JOIN areas a ON a.id = g.area_id
      WHERE g.id = t.goal_id
      AND a.direction_id = ANY(resolve_directions_for_date(p_user_id, p_date))
      AND (
        CASE WHEN p_date >= CURRENT_DATE THEN g.status IN ('active', 'maintenance')
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

-- 4) get_week_tasks — multi-direction + per-task directionVersion + check-in bypass
CREATE OR REPLACE FUNCTION get_week_tasks(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON AS $$
SELECT json_object_agg(d.dt::date::text, COALESCE(day_tasks.tasks, '[]'::json))
FROM generate_series(p_start_date, p_end_date, '1 day'::interval) AS d(dt)
LEFT JOIN LATERAL (
  SELECT resolve_directions_for_date(p_user_id, d.dt::date) AS dir_ids
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
  WHERE t.user_id = p_user_id
    AND (
      -- Goalless + no area → always show (no version association)
      (t.goal_id IS NULL AND t.area_id IS NULL)
      -- Goalless + has area → only if area belongs to any resolved direction
      OR (t.goal_id IS NULL AND t.area_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM areas a
        WHERE a.id = t.area_id AND a.direction_id = ANY(dir_ctx.dir_ids)
      ))
      -- Goal-based → in any resolved direction, with status filter only for today/future
      OR EXISTS (
        SELECT 1 FROM goals g
        JOIN areas a ON a.id = g.area_id
        WHERE g.id = t.goal_id
        AND a.direction_id = ANY(dir_ctx.dir_ids)
        AND (
          CASE WHEN d.dt::date >= CURRENT_DATE THEN g.status IN ('active', 'maintenance')
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
