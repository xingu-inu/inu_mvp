-- ============================================
-- Roadmap Versioning
-- Direction → Area 연결 + 다중 버전 지원
-- ============================================

-- ============================================
-- 1) direction_status enum
-- ============================================
CREATE TYPE direction_status AS ENUM ('active', 'archived');

-- ============================================
-- 2) directions 테이블 확장
-- ============================================
ALTER TABLE public.directions
  ADD COLUMN status direction_status NOT NULL DEFAULT 'active',
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN name TEXT,
  ADD COLUMN archived_at TIMESTAMPTZ;

-- 유저당 active direction 1개 보장 (partial unique index)
CREATE UNIQUE INDEX idx_directions_user_active
  ON public.directions(user_id) WHERE status = 'active';

-- 히스토리 조회용 인덱스
CREATE INDEX idx_directions_user_versions
  ON public.directions(user_id, version DESC);

-- ============================================
-- 3) areas 테이블에 direction_id FK 추가
-- ============================================
ALTER TABLE public.areas
  ADD COLUMN direction_id UUID REFERENCES public.directions(id) ON DELETE CASCADE;

CREATE INDEX idx_areas_direction ON public.areas(direction_id);

-- 기존 데이터 backfill: 각 user의 area → 해당 user의 direction에 연결
UPDATE public.areas a
SET direction_id = d.id
FROM public.directions d
WHERE a.user_id = d.user_id
  AND a.direction_id IS NULL;

-- backfill 후 NOT NULL 설정
ALTER TABLE public.areas
  ALTER COLUMN direction_id SET NOT NULL;

-- ============================================
-- 4) RLS 정책 업데이트 (areas)
-- ============================================
-- 기존 areas RLS는 user_id 기반이므로 변경 불필요
-- direction_id는 user_id를 통해 암시적으로 보호됨

-- ============================================
-- 5) get_today_tasks — direction filter 추가
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
    'startDate', t.start_date,
    'endDate', t.end_date,
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
      JOIN areas a ON a.id = g.area_id
      JOIN directions d ON d.id = a.direction_id
      WHERE g.id = t.goal_id
      AND g.status IN ('active', 'maintenance')
      AND d.status = 'active'
    )
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
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 6) get_week_tasks — direction filter 추가
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
      'startDate', t.start_date,
      'endDate', t.end_date,
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
        JOIN areas a ON a.id = g.area_id
        JOIN directions dir ON dir.id = a.direction_id
        WHERE g.id = t.goal_id
        AND g.status IN ('active', 'maintenance')
        AND dir.status = 'active'
      )
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
    )
) day_tasks ON true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 7) complete_onboarding — direction_id 추가
-- ============================================
CREATE OR REPLACE FUNCTION complete_onboarding(
  p_user_id UUID,
  p_direction JSONB,
  p_areas JSONB,
  p_first_goal JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_direction_id UUID;
  v_first_area_id UUID;
  v_goal_id UUID;
BEGIN
  -- 1. Direction 생성 (version=1, status=active)
  INSERT INTO directions (user_id, statement, why, status, version)
  VALUES (
    p_user_id,
    p_direction->>'statement',
    p_direction->>'why',
    'active',
    1
  )
  RETURNING id INTO v_direction_id;

  -- 2. Areas 생성 (direction_id 포함)
  WITH inserted_areas AS (
    INSERT INTO areas (user_id, direction_id, name, type, emoji, color, sort_order)
    SELECT
      p_user_id,
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

  -- 3. First Goal 생성 (선택적)
  IF p_first_goal IS NOT NULL AND p_first_goal->>'name' IS NOT NULL THEN
    INSERT INTO goals (user_id, area_id, name, why, status)
    VALUES (
      p_user_id,
      v_first_area_id,
      p_first_goal->>'name',
      p_first_goal->>'why',
      'active'
    )
    RETURNING id INTO v_goal_id;
  END IF;

  -- 4. 프로필 온보딩 완료 표시
  UPDATE profiles
  SET onboarding_completed = TRUE
  WHERE id = p_user_id;

  RETURN json_build_object(
    'directionId', v_direction_id,
    'firstAreaId', v_first_area_id,
    'firstGoalId', v_goal_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8) create_new_roadmap_version (핵심 트랜잭션)
-- ============================================
CREATE OR REPLACE FUNCTION create_new_roadmap_version(
  p_user_id UUID,
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
  WHERE user_id = p_user_id AND status = 'active'
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
  VALUES (p_user_id, p_statement, p_why, p_name, 'active', v_new_version)
  RETURNING id INTO v_new_direction_id;

  -- 4. 선택한 goal들을 deep copy
  FOR v_goal IN
    SELECT g.*
    FROM goals g
    WHERE g.id = ANY(p_carry_over_goal_ids)
      AND g.user_id = p_user_id
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
    VALUES (p_user_id, v_new_area_id, v_goal.name, v_goal.why, v_goal.vision,
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
      WHERE goal_id = v_goal.id AND group_id = v_group_rec.id AND user_id = p_user_id;
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
    WHERE goal_id = v_goal.id AND group_id IS NULL AND user_id = p_user_id;

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
-- 9) get_direction_history
-- ============================================
CREATE OR REPLACE FUNCTION get_direction_history(p_user_id UUID)
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
WHERE d.user_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 10) get_archived_roadmap
-- ============================================
CREATE OR REPLACE FUNCTION get_archived_roadmap(
  p_user_id UUID,
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
    WHERE d.id = p_direction_id AND d.user_id = p_user_id
  ),
  'areas', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', a.id, 'name', a.name, 'emoji', a.emoji, 'color', a.color,
        'type', a.type, 'why', a.why, 'sortOrder', a.sort_order, 'isActive', a.is_active
      ) ORDER BY a.sort_order
    ), '[]')
    FROM areas a
    WHERE a.direction_id = p_direction_id AND a.user_id = p_user_id
  ),
  'goals', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', g.id, 'name', g.name, 'areaId', g.area_id,
        'status', g.status::text, 'why', g.why, 'vision', g.vision,
        'targetDate', g.target_date, 'sortOrder', g.sort_order,
        'groups', (
          SELECT COALESCE(json_agg(
            json_build_object('id', gr.id, 'name', gr.name, 'why', gr.why, 'isCompleted', gr.is_completed)
            ORDER BY gr.sort_order
          ), '[]')
          FROM groups gr WHERE gr.goal_id = g.id
        ),
        'taskCount', (SELECT COUNT(*) FROM tasks tk WHERE tk.goal_id = g.id)
      ) ORDER BY g.sort_order
    ), '[]')
    FROM goals g
    JOIN areas a ON a.id = g.area_id
    WHERE a.direction_id = p_direction_id AND g.user_id = p_user_id
  )
);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- END OF MIGRATION
-- ============================================
