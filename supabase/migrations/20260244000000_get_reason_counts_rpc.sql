-- RPC: 기간별 상태 변경 사유 집계 (막힘 분석용)
-- 2개 sequential 쿼리 + JS 집계 → 1개 SQL GROUP BY로 대체

CREATE OR REPLACE FUNCTION get_reason_counts(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(reason TEXT, entity_count BIGINT, entity_type TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT reason, COUNT(*) as entity_count, 'goal'::TEXT as entity_type
  FROM goal_status_history
  WHERE user_id = p_user_id
    AND created_at >= p_start_date
    AND created_at < p_end_date + INTERVAL '1 day'
    AND reason IS NOT NULL
  GROUP BY reason
  UNION ALL
  SELECT reason, COUNT(*) as entity_count, 'task'::TEXT as entity_type
  FROM task_status_history
  WHERE user_id = p_user_id
    AND created_at >= p_start_date
    AND created_at < p_end_date + INTERVAL '1 day'
    AND reason IS NOT NULL
  GROUP BY reason
$$;
