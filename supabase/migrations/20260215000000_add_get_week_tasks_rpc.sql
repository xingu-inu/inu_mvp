-- ============================================
-- get_week_tasks: 주간 태스크 단일 RPC
-- 기존 get_today_tasks를 7번 호출하는 대신
-- 날짜 범위를 한 번에 처리하여 DB 부하를 1/7로 줄임
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
    AND t.is_active = TRUE
    AND (
      t.goal_id IS NULL
      OR EXISTS (
        SELECT 1 FROM goals g
        WHERE g.id = t.goal_id
        AND g.status IN ('active', 'maintenance')
      )
    )
    AND (
      t.repeat_type = 'daily'
      OR t.repeat_type = 'once'
      OR (t.repeat_type = 'weekdays' AND EXTRACT(DOW FROM d.dt) BETWEEN 1 AND 5)
      OR (t.repeat_type = 'weekends' AND EXTRACT(DOW FROM d.dt) IN (0, 6))
      OR (t.repeat_type = 'weekly' AND EXTRACT(DOW FROM d.dt) = ANY(t.repeat_days))
      OR (t.repeat_type = 'custom' AND EXTRACT(DOW FROM d.dt) = ANY(t.repeat_days))
    )
) day_tasks ON true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
