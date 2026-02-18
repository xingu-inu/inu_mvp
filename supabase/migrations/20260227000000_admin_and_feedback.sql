-- ============================================
-- 1. Add is_admin to profiles
-- ============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = TRUE;

-- ============================================
-- 2. Admin RLS policies (SELECT for read-all)
-- ============================================

-- profiles: admin can view all
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- profiles: admin can update all (for granting/revoking admin)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- check_ins: admin can view all
CREATE POLICY "Admins can view all check_ins"
  ON public.check_ins FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- tasks: admin can view all
CREATE POLICY "Admins can view all tasks"
  ON public.tasks FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- goals: admin can view all
CREATE POLICY "Admins can view all goals"
  ON public.goals FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- areas: admin can view all
CREATE POLICY "Admins can view all areas"
  ON public.areas FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- daily_reflections: admin can view all
CREATE POLICY "Admins can view all reflections"
  ON public.daily_reflections FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================
-- 3. Announcements table
-- ============================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'update', 'event')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active announcements
CREATE POLICY "Users can view active announcements"
  ON public.announcements FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- ============================================
-- 4. Feedbacks table
-- ============================================
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'bug', 'feature', 'improvement')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON public.feedbacks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.feedbacks FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON public.feedbacks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Admins can update feedback (status, admin_note)
CREATE POLICY "Admins can update feedback"
  ON public.feedbacks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- ============================================
-- 5. Admin Stats RPC
-- ============================================
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT json_build_object(
    'totalUsers', (SELECT COUNT(*) FROM public.profiles),
    'todaySignups', (SELECT COUNT(*) FROM public.profiles WHERE created_at::date = CURRENT_DATE),
    'weekSignups', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'monthSignups', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'),
    'onboardedUsers', (SELECT COUNT(*) FROM public.profiles WHERE onboarding_completed = TRUE),
    'todayActiveUsers', (SELECT COUNT(DISTINCT user_id) FROM public.check_ins WHERE date = CURRENT_DATE),
    'weekActiveUsers', (SELECT COUNT(DISTINCT user_id) FROM public.check_ins WHERE date >= CURRENT_DATE - INTERVAL '7 days'),
    'monthActiveUsers', (SELECT COUNT(DISTINCT user_id) FROM public.check_ins WHERE date >= CURRENT_DATE - INTERVAL '30 days'),
    'totalGoals', (SELECT COUNT(*) FROM public.goals),
    'totalTasks', (SELECT COUNT(*) FROM public.tasks),
    'todayCheckIns', (SELECT COUNT(*) FROM public.check_ins WHERE date = CURRENT_DATE),
    'totalFeedbacks', (SELECT COUNT(*) FROM public.feedbacks WHERE status = 'pending')
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Admin Signup Chart RPC
-- ============================================
CREATE OR REPLACE FUNCTION get_admin_signup_chart(p_days INTEGER DEFAULT 30)
RETURNS TABLE(date DATE, count BIGINT) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  RETURN QUERY
  SELECT d.date::DATE, COALESCE(c.cnt, 0) AS count
  FROM generate_series(
    CURRENT_DATE - (p_days || ' days')::INTERVAL,
    CURRENT_DATE,
    '1 day'
  ) AS d(date)
  LEFT JOIN (
    SELECT created_at::DATE AS signup_date, COUNT(*) AS cnt
    FROM public.profiles
    WHERE created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    GROUP BY created_at::DATE
  ) c ON d.date = c.signup_date
  ORDER BY d.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Grant admin to initial user
-- ============================================
UPDATE public.profiles SET is_admin = TRUE WHERE email = 'ojyoung24@naver.com';
