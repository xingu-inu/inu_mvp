-- ============================================
-- Fix: profiles RLS infinite recursion
--
-- 문제: "Admins can view all profiles" 정책이
-- profiles 테이블 내에서 profiles를 SELECT → 무한 재귀
--
-- 해결: SECURITY DEFINER 함수로 RLS를 우회하는 is_admin() 생성
-- 모든 admin 체크를 is_admin()으로 교체
-- ============================================

-- 1. RLS-safe admin check function (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Drop problematic profiles policies (self-referencing → recursion)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 3. Recreate profiles policies using is_admin()
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());

-- 4. Fix other tables' admin policies (also had the subquery pattern)
DROP POLICY IF EXISTS "Admins can view all check_ins" ON public.check_ins;
CREATE POLICY "Admins can view all check_ins"
  ON public.check_ins FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tasks;
CREATE POLICY "Admins can view all tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can view all goals" ON public.goals;
CREATE POLICY "Admins can view all goals"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can view all areas" ON public.areas;
CREATE POLICY "Admins can view all areas"
  ON public.areas FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can view all reflections" ON public.daily_reflections;
CREATE POLICY "Admins can view all reflections"
  ON public.daily_reflections FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- 5. Fix announcements admin policy
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (public.is_admin());

-- 6. Fix feedbacks admin policies
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedbacks;
CREATE POLICY "Admins can view all feedback"
  ON public.feedbacks FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedbacks;
CREATE POLICY "Admins can update feedback"
  ON public.feedbacks FOR UPDATE
  USING (public.is_admin());
