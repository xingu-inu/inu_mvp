-- ============================================
-- Cross-Area/Goal Task Linking
-- 1) Add related_goal_ids column to tasks
-- 2) Update get_today_tasks RPC to return relatedAreas + relatedGoals
-- 3) Update get_week_tasks RPC to return relatedAreas + relatedGoals
-- ============================================

-- ============================================
-- 1) Add related_goal_ids column + fix related_area_ids type
-- ============================================
ALTER TABLE public.tasks ALTER COLUMN related_area_ids DROP DEFAULT;
ALTER TABLE public.tasks ALTER COLUMN related_area_ids TYPE UUID[] USING related_area_ids::UUID[];
ALTER TABLE public.tasks ALTER COLUMN related_area_ids SET DEFAULT '{}';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS related_goal_ids UUID[] DEFAULT '{}';

-- ============================================
-- 2) get_today_tasks
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
    'timeSlot', t.time_slot,
    'specificTime', t.specific_time,
    'durationMinutes', t.duration_minutes,
    'streakCount', t.streak_count,
    'bestStreak', t.best_streak,
    'sortOrder', t.sort_order,
    'repeatType', t.repeat_type,
    'repeatDays', t.repeat_days,
    'scheduledDate', t.scheduled_date,
    'taskStatus', t.status::text,
    'isOverdue', (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date < p_date AND p_date = CURRENT_DATE),
    'totalCompleted', (
      SELECT COUNT(*) FROM check_ins c
      WHERE c.task_id = t.id AND c.status = 'done'
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
-- 3) get_week_tasks
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
      'groupId', t.group_id,
      'timeSlot', t.time_slot,
      'specificTime', t.specific_time,
      'durationMinutes', t.duration_minutes,
      'streakCount', t.streak_count,
      'bestStreak', t.best_streak,
      'sortOrder', t.sort_order,
      'repeatType', t.repeat_type,
      'repeatDays', t.repeat_days,
      'scheduledDate', t.scheduled_date,
      'taskStatus', t.status::text,
      'isOverdue', (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date < d.dt::date AND d.dt::date = CURRENT_DATE),
      'totalCompleted', (
        SELECT COUNT(*) FROM check_ins c
        WHERE c.task_id = t.id AND c.status = 'done'
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
