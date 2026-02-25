-- ============================================
-- Migration: Fix task ownership verification in check-in RPCs
-- Date: 2026-03-04
-- Security: V-07 - Task ownership not verified in create_checkin_with_streak
-- ============================================
--
-- VULNERABILITY:
-- The create_checkin_with_streak function queries tasks.repeat_type and streak data
-- without verifying user_id = auth.uid(). An attacker who knows another user's task UUID
-- could read private task data (repeat_type, streak_count, best_streak, last_check_in_date).
--
-- FIX:
-- 1. Add user_id = auth.uid() to all SELECT queries from tasks table
-- 2. Raise exception if task is not found or not owned by the user
-- 3. This ensures attackers cannot read task data by guessing UUIDs
--
-- NOTE: undo_checkin_with_streak already safely derives v_task_id from a verified check_in,
-- so only create_checkin_with_streak needs fixing.
-- ============================================

CREATE OR REPLACE FUNCTION create_checkin_with_streak(
  p_task_id UUID,
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
  v_repeat_type TEXT;
BEGIN
  -- SECURITY FIX: Verify task ownership BEFORE any data modification
  SELECT repeat_type INTO v_repeat_type
  FROM tasks
  WHERE id = p_task_id AND user_id = auth.uid();

  -- If task not found or not owned by user, reject immediately
  IF v_repeat_type IS NULL THEN
    RAISE EXCEPTION 'Task not found or access denied';
  END IF;

  -- Check-in 생성 (UPSERT) — only after ownership is verified
  INSERT INTO check_ins (task_id, user_id, date, status, note)
  VALUES (p_task_id, auth.uid(), p_date, p_status, p_note)
  ON CONFLICT (task_id, date) DO UPDATE SET status = p_status, note = p_note
  RETURNING id INTO v_checkin_id;

  -- Skip streak logic for once tasks
  IF v_repeat_type != 'once' THEN
    -- SECURITY FIX: Verify task ownership when reading streak data
    SELECT last_check_in_date, streak_count, best_streak
    INTO v_last_date, v_new_streak, v_best_streak
    FROM tasks
    WHERE id = p_task_id AND user_id = auth.uid();

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

      -- Task 업데이트 (with user_id check)
      UPDATE tasks SET
        streak_count = v_new_streak,
        best_streak = v_best_streak,
        last_check_in_date = p_date
      WHERE id = p_task_id AND user_id = auth.uid();
    END IF;
  END IF;

  -- Auto-complete once tasks on done check-in
  IF v_repeat_type = 'once' AND p_status = 'done' THEN
    UPDATE tasks SET
      status = 'completed',
      completed_at = NOW()
    WHERE id = p_task_id AND user_id = auth.uid();
  END IF;

  RETURN json_build_object(
    'checkinId', v_checkin_id,
    'newStreak', v_new_streak,
    'bestStreak', v_best_streak
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
