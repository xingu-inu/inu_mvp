-- ============================================
-- inu (이누) - Initial Database Schema
-- Phase 3: Supabase Backend Setup
-- ============================================
-- Run this SQL in Supabase Dashboard SQL Editor
-- Execute in order: Extensions → Enums → Tables → Indexes → Triggers → RLS → Auth → RPC → Storage
-- ============================================

-- ============================================
-- 1. EXTENSIONS (gen_random_uuid() is built-in, no extension needed)
-- ============================================

-- ============================================
-- 2. ENUMS
-- ============================================
CREATE TYPE area_type AS ENUM (
  'health', 'career', 'finance', 'relationships',
  'hobbies', 'mental', 'learning', 'daily', 'custom'
);

CREATE TYPE goal_status AS ENUM (
  'active', 'backlog', 'completed', 'maintenance', 'paused', 'archived'
);

CREATE TYPE phase_status AS ENUM ('pending', 'active', 'completed');

CREATE TYPE repeat_type AS ENUM (
  'daily', 'weekdays', 'weekends', 'weekly', 'custom'
);

CREATE TYPE time_slot AS ENUM (
  'early_morning', 'morning', 'late_morning',
  'afternoon', 'evening', 'night', 'anytime'
);

CREATE TYPE checkin_status AS ENUM ('done', 'skip', 'miss');

CREATE TYPE mood_level AS ENUM ('terrible', 'bad', 'neutral', 'good', 'great');

CREATE TYPE message_type AS ENUM (
  'celebration', 'encouragement', 'insight', 'suggestion', 'reminder'
);

-- ============================================
-- 3. TABLES
-- ============================================

-- PROFILES (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'Asia/Seoul',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DIRECTIONS (Life Direction - Top Level)
CREATE TABLE public.directions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  statement TEXT NOT NULL,
  why TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AREAS (Life Domains)
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type area_type NOT NULL DEFAULT 'custom',
  emoji TEXT NOT NULL DEFAULT '📌',
  color TEXT NOT NULL DEFAULT '#6b7280',
  why TEXT,
  sort_order TEXT DEFAULT '0',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GOALS
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  why TEXT,
  vision TEXT,
  status goal_status NOT NULL DEFAULT 'active',
  target_date DATE,
  completed_at TIMESTAMPTZ,
  sort_order TEXT DEFAULT '0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PHASES (Optional milestones within goals)
CREATE TABLE public.phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  why TEXT,
  description TEXT,
  status phase_status NOT NULL DEFAULT 'pending',
  sort_order TEXT DEFAULT '0',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASKS (Repeatable actions)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  phase_id UUID REFERENCES public.phases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  why TEXT,
  repeat_type repeat_type NOT NULL DEFAULT 'daily',
  repeat_days INTEGER[] DEFAULT NULL,
  duration_minutes INTEGER DEFAULT 15,
  time_slot time_slot NOT NULL DEFAULT 'anytime',
  specific_time TIME,
  streak_count INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_check_in_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order TEXT DEFAULT '0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHECK-INS (Daily task completion records)
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status checkin_status NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, date)
);

-- DAILY REFLECTIONS
CREATE TABLE public.daily_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood mood_level,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- AI MESSAGES (Rule-based advisor messages)
CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type message_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. BASE INDEXES
-- ============================================
CREATE INDEX idx_directions_user ON public.directions(user_id);
CREATE INDEX idx_areas_user ON public.areas(user_id);
CREATE INDEX idx_goals_user ON public.goals(user_id);
CREATE INDEX idx_goals_area ON public.goals(area_id);
CREATE INDEX idx_goals_status ON public.goals(status);
CREATE INDEX idx_phases_goal ON public.phases(goal_id);
CREATE INDEX idx_tasks_user ON public.tasks(user_id);
CREATE INDEX idx_tasks_goal ON public.tasks(goal_id);
CREATE INDEX idx_check_ins_task ON public.check_ins(task_id);
CREATE INDEX idx_check_ins_user_date ON public.check_ins(user_id, date);
CREATE INDEX idx_reflections_user_date ON public.daily_reflections(user_id, date);
CREATE INDEX idx_ai_messages_user ON public.ai_messages(user_id, is_read);

-- ============================================
-- 5. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER directions_updated_at
  BEFORE UPDATE ON public.directions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER areas_updated_at
  BEFORE UPDATE ON public.areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER phases_updated_at
  BEFORE UPDATE ON public.phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reflections_updated_at
  BEFORE UPDATE ON public.daily_reflections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- DIRECTIONS POLICIES
CREATE POLICY "Users can CRUD own directions"
  ON public.directions FOR ALL
  USING (auth.uid() = user_id);

-- AREAS POLICIES
CREATE POLICY "Users can CRUD own areas"
  ON public.areas FOR ALL
  USING (auth.uid() = user_id);

-- GOALS POLICIES
CREATE POLICY "Users can CRUD own goals"
  ON public.goals FOR ALL
  USING (auth.uid() = user_id);

-- PHASES POLICIES
CREATE POLICY "Users can CRUD own phases"
  ON public.phases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = phases.goal_id
      AND goals.user_id = auth.uid()
    )
  );

-- TASKS POLICIES
CREATE POLICY "Users can CRUD own tasks"
  ON public.tasks FOR ALL
  USING (auth.uid() = user_id);

-- CHECK-INS POLICIES
CREATE POLICY "Users can CRUD own check-ins"
  ON public.check_ins FOR ALL
  USING (auth.uid() = user_id);

-- DAILY REFLECTIONS POLICIES
CREATE POLICY "Users can CRUD own reflections"
  ON public.daily_reflections FOR ALL
  USING (auth.uid() = user_id);

-- AI MESSAGES POLICIES
CREATE POLICY "Users can read own AI messages"
  ON public.ai_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own AI messages"
  ON public.ai_messages FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. AUTH TRIGGER (Create Profile on Signup)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 8. PERFORMANCE OPTIMIZATION INDEXES
-- ============================================

-- Today 화면: 활성 태스크 + 시간대별 조회
CREATE INDEX idx_tasks_user_active_time
ON public.tasks(user_id, is_active, time_slot);

-- 활성 태스크만 조회 (Partial Index)
CREATE INDEX idx_tasks_user_active
ON public.tasks(user_id)
WHERE is_active = TRUE;

-- Goals 상태별 조회
CREATE INDEX idx_goals_user_status
ON public.goals(user_id, status);

-- Check-ins 날짜별 조회 (가장 빈번)
CREATE INDEX idx_checkins_user_date
ON public.check_ins(user_id, date DESC);

-- Phases 활성 상태 조회 (Partial Index)
CREATE INDEX idx_phases_goal_active
ON public.phases(goal_id, status)
WHERE status = 'active';

-- Fractional Indexing 정렬용
CREATE INDEX idx_tasks_order ON public.tasks(user_id, sort_order);
CREATE INDEX idx_goals_order ON public.goals(area_id, sort_order);
CREATE INDEX idx_areas_order ON public.areas(user_id, sort_order);
CREATE INDEX idx_phases_order ON public.phases(goal_id, sort_order);

-- 월간 통계 조회 최적화 (date column is already indexed via idx_checkins_user_date)

-- AI 메시지 생성일 기준 조회
CREATE INDEX idx_ai_messages_created
ON public.ai_messages(user_id, created_at DESC);

-- 활성 목표만 조회 (Partial Index)
CREATE INDEX idx_goals_user_active
ON public.goals(user_id)
WHERE status = 'active';

-- ============================================
-- 9. RPC FUNCTIONS
-- ============================================

-- TODAY 화면 전용 (가장 자주 호출)
CREATE OR REPLACE FUNCTION get_today_dashboard(p_user_id UUID)
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
    WHERE t.user_id = p_user_id
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
        WHERE c.user_id = p_user_id
        AND c.date = CURRENT_DATE
        AND c.status = 'done'
      ),
      'totalToday', (
        SELECT COUNT(*) FROM tasks t
        WHERE t.user_id = p_user_id
        AND t.is_active = TRUE
      ),
      'currentStreak', COALESCE((
        SELECT MAX(t.streak_count) FROM tasks t
        WHERE t.user_id = p_user_id AND t.is_active = TRUE
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
    WHERE c.user_id = p_user_id
    AND c.date = CURRENT_DATE
    LIMIT 20
  )
);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- TODAY 화면 - 오늘의 Task 목록만 (간단 버전)
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
    'goal', (
      SELECT json_build_object(
        'id', g.id,
        'name', g.name,
        'areaId', g.area_id,
        'area', (
          SELECT json_build_object('id', a.id, 'name', a.name, 'emoji', a.emoji, 'color', a.color)
          FROM areas a WHERE a.id = g.area_id
        )
      )
      FROM goals g WHERE g.id = t.goal_id
    ),
    'phase', (
      SELECT json_build_object('id', p.id, 'name', p.name)
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
  AND t.is_active = TRUE
  AND (
    t.repeat_type = 'daily'
    OR (t.repeat_type = 'weekdays' AND EXTRACT(DOW FROM p_date) BETWEEN 1 AND 5)
    OR (t.repeat_type = 'weekends' AND EXTRACT(DOW FROM p_date) IN (0, 6))
    OR (t.repeat_type = 'weekly' AND EXTRACT(DOW FROM p_date) = ANY(t.repeat_days))
    OR (t.repeat_type = 'custom' AND EXTRACT(DOW FROM p_date) = ANY(t.repeat_days))
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ROADMAP 화면 전용
CREATE OR REPLACE FUNCTION get_roadmap_data(p_user_id UUID)
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
    FROM directions d WHERE d.user_id = p_user_id
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
    FROM areas a WHERE a.user_id = p_user_id AND a.is_active = TRUE
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
    FROM goals g WHERE g.user_id = p_user_id AND g.status != 'archived'
  )
);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- CHECK-IN 생성 + 스트릭 자동 업데이트
CREATE OR REPLACE FUNCTION create_checkin_with_streak(
  p_task_id UUID,
  p_user_id UUID,
  p_status checkin_status,
  p_note TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_checkin_id UUID;
  v_new_streak INTEGER;
  v_best_streak INTEGER;
  v_last_date DATE;
BEGIN
  -- Check-in 생성 (UPSERT)
  INSERT INTO check_ins (task_id, user_id, date, status, note)
  VALUES (p_task_id, p_user_id, CURRENT_DATE, p_status, p_note)
  ON CONFLICT (task_id, date) DO UPDATE SET status = p_status, note = p_note
  RETURNING id INTO v_checkin_id;

  -- 스트릭 계산
  SELECT last_check_in_date, streak_count, best_streak
  INTO v_last_date, v_new_streak, v_best_streak
  FROM tasks WHERE id = p_task_id;

  IF p_status = 'done' THEN
    -- 연속 체크인 확인
    IF v_last_date = CURRENT_DATE - 1 OR v_last_date IS NULL THEN
      v_new_streak := COALESCE(v_new_streak, 0) + 1;
    ELSIF v_last_date != CURRENT_DATE THEN
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
      last_check_in_date = CURRENT_DATE
    WHERE id = p_task_id;
  END IF;

  RETURN json_build_object(
    'checkinId', v_checkin_id,
    'newStreak', v_new_streak,
    'bestStreak', v_best_streak
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 배치 업데이트 (드래그 앤 드롭 순서 변경)
CREATE OR REPLACE FUNCTION batch_update_sort_order(
  p_table_name TEXT,
  p_updates JSONB
)
RETURNS void AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    EXECUTE format(
      'UPDATE %I SET sort_order = $1, updated_at = NOW() WHERE id = $2',
      p_table_name
    ) USING item->>'sortOrder', (item->>'id')::UUID;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 스트릭 리셋 (Cron Job용)
CREATE OR REPLACE FUNCTION reset_missed_streaks()
RETURNS void AS $$
BEGIN
  UPDATE tasks
  SET streak_count = 0
  WHERE is_active = TRUE
    AND repeat_type = 'daily'
    AND last_check_in_date < CURRENT_DATE - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 주간 통계 계산 (Review 화면용)
CREATE OR REPLACE FUNCTION get_weekly_stats(
  p_user_id UUID,
  p_week_start DATE
)
RETURNS JSON AS $$
SELECT json_build_object(
  'totalTasks', (
    SELECT COUNT(DISTINCT c.task_id)
    FROM check_ins c
    WHERE c.user_id = p_user_id
      AND c.date >= p_week_start
      AND c.date < p_week_start + INTERVAL '7 days'
  ),
  'completedCount', (
    SELECT COUNT(*)
    FROM check_ins c
    WHERE c.user_id = p_user_id
      AND c.date >= p_week_start
      AND c.date < p_week_start + INTERVAL '7 days'
      AND c.status = 'done'
  ),
  'skippedCount', (
    SELECT COUNT(*)
    FROM check_ins c
    WHERE c.user_id = p_user_id
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
      WHERE c.user_id = p_user_id
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
      WHERE c.user_id = p_user_id
        AND c.date >= p_week_start
        AND c.date < p_week_start + INTERVAL '7 days'
      GROUP BY g.area_id
    ) a
    JOIN areas ar ON ar.id = a.area_id
  )
);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 온보딩 완료 처리 (트랜잭션)
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
  -- 1. Direction 생성
  INSERT INTO directions (user_id, statement, why)
  VALUES (
    p_user_id,
    p_direction->>'statement',
    p_direction->>'why'
  )
  RETURNING id INTO v_direction_id;

  -- 2. Areas 생성
  WITH inserted_areas AS (
    INSERT INTO areas (user_id, name, type, emoji, color, sort_order)
    SELECT
      p_user_id,
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
-- 10. STORAGE BUCKET (Avatars)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Storage RLS 정책
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- ============================================
-- 11. REALTIME SETUP
-- ============================================
-- Realtime Publication에 테이블 추가
ALTER PUBLICATION supabase_realtime ADD TABLE check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_messages;

-- ============================================
-- END OF MIGRATION
-- ============================================
