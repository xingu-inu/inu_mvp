-- ============================================
-- Add date parameter to create_checkin_with_streak
-- Allows check-ins for past dates
-- ============================================

CREATE OR REPLACE FUNCTION create_checkin_with_streak(
  p_task_id UUID,
  p_user_id UUID,
  p_status checkin_status,
  p_date DATE DEFAULT CURRENT_DATE,
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
  VALUES (p_task_id, p_user_id, p_date, p_status, p_note)
  ON CONFLICT (task_id, date) DO UPDATE SET status = p_status, note = p_note
  RETURNING id INTO v_checkin_id;

  -- 스트릭 계산
  SELECT last_check_in_date, streak_count, best_streak
  INTO v_last_date, v_new_streak, v_best_streak
  FROM tasks WHERE id = p_task_id;

  IF p_status = 'done' THEN
    -- 연속 체크인 확인
    IF v_last_date = p_date - 1 OR v_last_date IS NULL THEN
      v_new_streak := COALESCE(v_new_streak, 0) + 1;
    ELSIF v_last_date != p_date THEN
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
      last_check_in_date = p_date
    WHERE id = p_task_id;
  END IF;

  RETURN json_build_object(
    'checkinId', v_checkin_id,
    'newStreak', v_new_streak,
    'bestStreak', v_best_streak
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
