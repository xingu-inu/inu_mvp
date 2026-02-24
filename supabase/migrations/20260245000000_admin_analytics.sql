-- ============================================
-- Admin Analytics RPC Functions
-- 6 analytics endpoints for the admin dashboard
-- ============================================

-- ============================================
-- 1. get_admin_engagement_stats
-- Returns DAU/WAU/MAU time series + summary
-- with current vs previous period comparison
-- ============================================
CREATE OR REPLACE FUNCTION get_admin_engagement_stats(p_days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT json_build_object(
    'series', (
      SELECT json_agg(row_to_json(s) ORDER BY s.date)
      FROM (
        SELECT
          d.date::DATE AS date,
          -- DAU: distinct users with a check-in on exactly this date
          COALESCE((
            SELECT COUNT(DISTINCT ci.user_id)
            FROM public.check_ins ci
            WHERE ci.date = d.date::DATE
          ), 0) AS dau,
          -- WAU: distinct users with a check-in in the 7 days ending this date
          COALESCE((
            SELECT COUNT(DISTINCT ci.user_id)
            FROM public.check_ins ci
            WHERE ci.date BETWEEN d.date::DATE - INTERVAL '6 days' AND d.date::DATE
          ), 0) AS wau,
          -- MAU: distinct users with a check-in in the 30 days ending this date
          COALESCE((
            SELECT COUNT(DISTINCT ci.user_id)
            FROM public.check_ins ci
            WHERE ci.date BETWEEN d.date::DATE - INTERVAL '29 days' AND d.date::DATE
          ), 0) AS mau
        FROM generate_series(
          CURRENT_DATE - (p_days || ' days')::INTERVAL,
          CURRENT_DATE,
          '1 day'
        ) AS d(date)
      ) s
    ),
    'summary', json_build_object(
      -- Current period: last p_days window
      'current_dau', COALESCE((
        SELECT ROUND(AVG(daily_count), 2)
        FROM (
          SELECT COUNT(DISTINCT user_id) AS daily_count
          FROM public.check_ins
          WHERE date BETWEEN CURRENT_DATE - (p_days || ' days')::INTERVAL AND CURRENT_DATE
          GROUP BY date
        ) sub
      ), 0),
      -- Previous period: the p_days window before current
      'prev_dau', COALESCE((
        SELECT ROUND(AVG(daily_count), 2)
        FROM (
          SELECT COUNT(DISTINCT user_id) AS daily_count
          FROM public.check_ins
          WHERE date BETWEEN CURRENT_DATE - (p_days * 2 || ' days')::INTERVAL
                         AND CURRENT_DATE - (p_days || ' days')::INTERVAL - INTERVAL '1 day'
          GROUP BY date
        ) sub
      ), 0),
      -- Current WAU: distinct users in last 7 days
      'current_wau', (
        SELECT COUNT(DISTINCT user_id)
        FROM public.check_ins
        WHERE date >= CURRENT_DATE - INTERVAL '6 days'
      ),
      -- Previous WAU: distinct users in the 7 days before that
      'prev_wau', (
        SELECT COUNT(DISTINCT user_id)
        FROM public.check_ins
        WHERE date BETWEEN CURRENT_DATE - INTERVAL '13 days'
                       AND CURRENT_DATE - INTERVAL '7 days'
      ),
      -- Current MAU: distinct users in last 30 days
      'current_mau', (
        SELECT COUNT(DISTINCT user_id)
        FROM public.check_ins
        WHERE date >= CURRENT_DATE - INTERVAL '29 days'
      ),
      -- Previous MAU: distinct users in the 30 days before that
      'prev_mau', (
        SELECT COUNT(DISTINCT user_id)
        FROM public.check_ins
        WHERE date BETWEEN CURRENT_DATE - INTERVAL '59 days'
                       AND CURRENT_DATE - INTERVAL '30 days'
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. get_admin_onboarding_funnel
-- Returns all-time funnel counts showing how
-- many users completed each onboarding step
-- ============================================
CREATE OR REPLACE FUNCTION get_admin_onboarding_funnel()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT json_build_object(
    -- Total registered users
    'signed_up', (
      SELECT COUNT(*) FROM public.profiles
    ),
    -- Users who set a life direction
    'has_direction', (
      SELECT COUNT(DISTINCT user_id) FROM public.directions
    ),
    -- Users who created at least one area
    'has_area', (
      SELECT COUNT(DISTINCT user_id) FROM public.areas
    ),
    -- Users who created at least one goal
    -- goals has user_id directly
    'has_goal', (
      SELECT COUNT(DISTINCT user_id) FROM public.goals
    ),
    -- Users who created at least one task
    -- tasks has user_id directly
    'has_task', (
      SELECT COUNT(DISTINCT user_id) FROM public.tasks
    ),
    -- Users who completed at least one check-in
    -- check_ins has user_id directly
    'has_checkin', (
      SELECT COUNT(DISTINCT user_id) FROM public.check_ins
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. get_admin_retention_cohorts
-- Week-over-week retention matrix showing what
-- % of each signup cohort returned in week N
-- ============================================
CREATE OR REPLACE FUNCTION get_admin_retention_cohorts(p_cohort_count INTEGER DEFAULT 8)
RETURNS TABLE(
  cohort_week  TEXT,
  cohort_size  INT,
  week_0       NUMERIC,
  week_1       NUMERIC,
  week_2       NUMERIC,
  week_3       NUMERIC,
  week_4       NUMERIC,
  week_5       NUMERIC,
  week_6       NUMERIC,
  week_7       NUMERIC,
  week_8       NUMERIC
) AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  RETURN QUERY
  WITH cohorts AS (
    -- Group users by the ISO week they signed up
    -- profiles.id IS the auth user id (no separate user_id column)
    SELECT
      id AS user_id,
      DATE_TRUNC('week', created_at)::DATE AS signup_week
    FROM public.profiles
    WHERE created_at IS NOT NULL
  ),
  cohort_sizes AS (
    SELECT
      signup_week,
      COUNT(*) AS cohort_size
    FROM cohorts
    GROUP BY signup_week
    ORDER BY signup_week DESC
    LIMIT p_cohort_count
  ),
  -- For each user+cohort, find which weeks they had at least one check-in
  user_activity AS (
    SELECT
      c.user_id,
      c.signup_week,
      -- How many weeks after signup did this check-in happen?
      FLOOR(
        EXTRACT(EPOCH FROM (DATE_TRUNC('week', ci.date::TIMESTAMPTZ) - c.signup_week::TIMESTAMPTZ))
        / (7 * 86400)
      )::INT AS week_offset
    FROM cohorts c
    INNER JOIN cohort_sizes cs ON c.signup_week = cs.signup_week
    INNER JOIN public.check_ins ci ON ci.user_id = c.user_id
    WHERE ci.date >= c.signup_week
      AND ci.date < c.signup_week + INTERVAL '9 weeks'
    GROUP BY c.user_id, c.signup_week, week_offset
  )
  SELECT
    TO_CHAR(cs.signup_week, 'YYYY-MM-DD') AS cohort_week,
    cs.cohort_size::INT,
    -- week_N = % of cohort users who had at least one check-in in that week
    ROUND(100.0 * COUNT(ua.user_id) FILTER (WHERE ua.week_offset = 0) / NULLIF(cs.cohort_size, 0), 1) AS week_0,
    ROUND(100.0 * COUNT(ua.user_id) FILTER (WHERE ua.week_offset = 1) / NULLIF(cs.cohort_size, 0), 1) AS week_1,
    ROUND(100.0 * COUNT(ua.user_id) FILTER (WHERE ua.week_offset = 2) / NULLIF(cs.cohort_size, 0), 1) AS week_2,
    ROUND(100.0 * COUNT(ua.user_id) FILTER (WHERE ua.week_offset = 3) / NULLIF(cs.cohort_size, 0), 1) AS week_3,
    ROUND(100.0 * COUNT(ua.user_id) FILTER (WHERE ua.week_offset = 4) / NULLIF(cs.cohort_size, 0), 1) AS week_4,
    ROUND(100.0 * COUNT(ua.user_id) FILTER (WHERE ua.week_offset = 5) / NULLIF(cs.cohort_size, 0), 1) AS week_5,
    ROUND(100.0 * COUNT(ua.user_id) FILTER (WHERE ua.week_offset = 6) / NULLIF(cs.cohort_size, 0), 1) AS week_6,
    ROUND(100.0 * COUNT(ua.user_id) FILTER (WHERE ua.week_offset = 7) / NULLIF(cs.cohort_size, 0), 1) AS week_7,
    ROUND(100.0 * COUNT(ua.user_id) FILTER (WHERE ua.week_offset = 8) / NULLIF(cs.cohort_size, 0), 1) AS week_8
  FROM cohort_sizes cs
  LEFT JOIN user_activity ua ON ua.signup_week = cs.signup_week
  GROUP BY cs.signup_week, cs.cohort_size
  ORDER BY cs.signup_week DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. get_admin_feature_adoption
-- Feature usage rates across the user base
-- ============================================
CREATE OR REPLACE FUNCTION get_admin_feature_adoption()
RETURNS JSON AS $$
DECLARE
  v_total_users   BIGINT;
  v_total_tasks   BIGINT;
  v_total_goals   BIGINT;
  v_result        JSON;
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  SELECT COUNT(*) INTO v_total_tasks FROM public.tasks;
  SELECT COUNT(*) INTO v_total_goals FROM public.goals;

  SELECT json_build_object(
    'total_users', v_total_users,

    -- % of tasks that have a specific time_slot set (excluding 'anytime')
    'time_slot_rate', (
      CASE WHEN v_total_tasks = 0 THEN 0
      ELSE ROUND(
        100.0 * (
          SELECT COUNT(*) FROM public.tasks
          WHERE time_slot IS NOT NULL
            AND time_slot != 'anytime'
        ) / v_total_tasks,
        1
      )
      END
    ),

    -- % of tasks that have a why filled in
    'why_rate', (
      CASE WHEN v_total_tasks = 0 THEN 0
      ELSE ROUND(
        100.0 * (
          SELECT COUNT(*) FROM public.tasks
          WHERE why IS NOT NULL AND why != ''
        ) / v_total_tasks,
        1
      )
      END
    ),

    -- % of users who have written at least one daily reflection
    'reflection_rate', (
      CASE WHEN v_total_users = 0 THEN 0
      ELSE ROUND(
        100.0 * (
          SELECT COUNT(DISTINCT user_id) FROM public.daily_reflections
        ) / v_total_users,
        1
      )
      END
    ),

    -- % of goals that have at least one group
    -- groups.goal_id references goals.id
    'group_rate', (
      CASE WHEN v_total_goals = 0 THEN 0
      ELSE ROUND(
        100.0 * (
          SELECT COUNT(DISTINCT goal_id) FROM public.groups
        ) / v_total_goals,
        1
      )
      END
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. get_admin_streak_distribution
-- Streak count bucketed distribution for tasks
-- belonging to active goals only
-- ============================================
CREATE OR REPLACE FUNCTION get_admin_streak_distribution()
RETURNS TABLE(
  bucket TEXT,
  count  INT
) AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  RETURN QUERY
  WITH task_streaks AS (
    -- Only tasks whose goal is active; treat NULL streak_count as 0
    SELECT COALESCE(t.streak_count, 0) AS streak
    FROM public.tasks t
    INNER JOIN public.goals g ON g.id = t.goal_id
    WHERE g.status = 'active'
  ),
  bucketed AS (
    SELECT
      CASE
        WHEN streak = 0         THEN '0'
        WHEN streak BETWEEN 1  AND 3  THEN '1-3'
        WHEN streak BETWEEN 4  AND 7  THEN '4-7'
        WHEN streak BETWEEN 8  AND 14 THEN '8-14'
        WHEN streak BETWEEN 15 AND 30 THEN '15-30'
        ELSE '30+'
      END AS bucket,
      -- Ordering key so results come back in logical order
      CASE
        WHEN streak = 0         THEN 1
        WHEN streak BETWEEN 1  AND 3  THEN 2
        WHEN streak BETWEEN 4  AND 7  THEN 3
        WHEN streak BETWEEN 8  AND 14 THEN 4
        WHEN streak BETWEEN 15 AND 30 THEN 5
        ELSE 6
      END AS bucket_order
    FROM task_streaks
  )
  SELECT
    b.bucket,
    COUNT(*)::INT AS count
  FROM bucketed b
  GROUP BY b.bucket, b.bucket_order
  ORDER BY b.bucket_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
