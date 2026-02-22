-- ============================================
-- Fix: get_today_tasks missing area.sortOrder
--
-- Problem: get_today_tasks omits sortOrder from the goal.area
-- subquery, while get_week_tasks includes it.
-- When mutation onSettled invalidates both daily and weekly
-- caches, the daily refetch returns area data without sortOrder,
-- causing area groups to lose their ordering until the weekly
-- refetch re-seeds the daily cache.
--
-- Fix: Add 'sortOrder', a.sort_order to goal.area subquery
-- (matches get_week_tasks definition)
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
WHERE t.user_id = p_user_id
  AND (
    -- Goalless + no area: always show (no version association)
    (t.goal_id IS NULL AND t.area_id IS NULL)
    -- Goalless + has area: only if area belongs to any resolved direction
    OR (t.goal_id IS NULL AND t.area_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM areas a
      WHERE a.id = t.area_id AND a.direction_id = ANY(resolve_directions_for_date(p_user_id, p_date))
    ))
    -- Goal-based: in any resolved direction, with status filter only for today/future
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
