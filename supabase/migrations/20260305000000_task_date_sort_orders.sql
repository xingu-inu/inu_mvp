-- ============================================
-- Migration: Per-date task sort order overrides
--
-- Problem: sort_order on the tasks table is global — reordering tasks
-- on Monday also changes their order on Tuesday. Users expect
-- date-specific ordering so that each day can have its own arrangement.
--
-- Solution: A new junction table task_date_sort_orders stores per-date
-- overrides. RPCs use COALESCE(tdso.sort_order, t.sort_order) so
-- dates without overrides fall back to the global sort_order.
-- ============================================

-- 1. Create the per-date sort order table
CREATE TABLE task_date_sort_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sort_order TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, date)
);

-- Index for fast lookups by user + date range (week queries)
CREATE INDEX idx_task_date_sort_orders_user_date
  ON task_date_sort_orders(user_id, date);

-- 2. RLS policies
ALTER TABLE task_date_sort_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task date sort orders"
  ON task_date_sort_orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own task date sort orders"
  ON task_date_sort_orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own task date sort orders"
  ON task_date_sort_orders FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own task date sort orders"
  ON task_date_sort_orders FOR DELETE
  USING (user_id = auth.uid());

-- Admin full access
CREATE POLICY "Admin full access to task_date_sort_orders"
  ON task_date_sort_orders FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 3. RPC: upsert_task_date_sort_order
CREATE OR REPLACE FUNCTION upsert_task_date_sort_order(
  p_task_id UUID,
  p_date DATE,
  p_sort_order TEXT
)
RETURNS void AS $$
BEGIN
  -- Verify task ownership
  IF NOT EXISTS (SELECT 1 FROM tasks WHERE id = p_task_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Task not found or access denied';
  END IF;

  INSERT INTO task_date_sort_orders (task_id, date, sort_order, user_id)
  VALUES (p_task_id, p_date, p_sort_order, auth.uid())
  ON CONFLICT (task_id, date) DO UPDATE SET
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update get_today_tasks to use date-specific sort order
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
    'sortOrder', COALESCE(tdso.sort_order, t.sort_order),
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
  ) ORDER BY COALESCE(tdso.sort_order, t.sort_order)
), '[]')
FROM tasks t
LEFT JOIN task_date_sort_orders tdso
  ON tdso.task_id = t.id AND tdso.date = p_date AND tdso.user_id = auth.uid()
WHERE t.user_id = auth.uid()
  AND (
    (t.goal_id IS NULL AND t.area_id IS NULL)
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
      AND (
        CASE WHEN p_direction_id IS NOT NULL THEN TRUE
        WHEN p_date >= CURRENT_DATE THEN g.status IN ('active', 'maintenance')
        ELSE TRUE END
      )
    )
    OR (t.repeat_type = 'once' AND t.scheduled_date = p_date)
    OR EXISTS (SELECT 1 FROM check_ins c WHERE c.task_id = t.id AND c.date = p_date)
  )
  AND (
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
    OR (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date = p_date)
    OR (t.repeat_type = 'once' AND t.status = 'completed' AND t.scheduled_date = p_date)
    OR (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date < p_date AND p_date = CURRENT_DATE)
    OR EXISTS (
      SELECT 1 FROM check_ins c
      WHERE c.task_id = t.id AND c.date = p_date
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5. Update get_week_tasks to use date-specific sort order
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
      'sortOrder', COALESCE(tdso.sort_order, t.sort_order),
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
    ) ORDER BY COALESCE(tdso.sort_order, t.sort_order)
  ) AS tasks
  FROM tasks t
  LEFT JOIN task_date_sort_orders tdso
    ON tdso.task_id = t.id AND tdso.date = d.dt::date AND tdso.user_id = auth.uid()
  WHERE t.user_id = auth.uid()
    AND (
      (t.goal_id IS NULL AND t.area_id IS NULL)
      OR (t.goal_id IS NULL AND t.area_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM areas a
        WHERE a.id = t.area_id AND a.direction_id = ANY(dir_ctx.dir_ids)
      ))
      OR EXISTS (
        SELECT 1 FROM goals g
        JOIN areas a ON a.id = g.area_id
        WHERE g.id = t.goal_id
        AND a.direction_id = ANY(dir_ctx.dir_ids)
        AND (
          CASE WHEN p_direction_id IS NOT NULL THEN TRUE
          WHEN d.dt::date >= CURRENT_DATE THEN g.status IN ('active', 'maintenance')
          ELSE TRUE END
        )
      )
      OR (t.repeat_type = 'once' AND t.scheduled_date = d.dt::date)
      OR EXISTS (SELECT 1 FROM check_ins c WHERE c.task_id = t.id AND c.date = d.dt::date)
    )
    AND (
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
      OR (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date = d.dt::date)
      OR (t.repeat_type = 'once' AND t.status = 'completed' AND t.scheduled_date = d.dt::date)
      OR (t.repeat_type = 'once' AND t.status = 'active' AND t.scheduled_date < d.dt::date AND d.dt::date = CURRENT_DATE)
      OR EXISTS (
        SELECT 1 FROM check_ins c
        WHERE c.task_id = t.id AND c.date = d.dt::date
      )
    )
) day_tasks ON true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
