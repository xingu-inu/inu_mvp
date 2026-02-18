-- ============================================
-- complete_onboarding — p_first_task 파라미터 추가
-- Goal 생성 시 첫 Task도 함께 생성할 수 있도록 확장
-- ============================================

CREATE OR REPLACE FUNCTION complete_onboarding(
  p_user_id UUID,
  p_direction JSONB,
  p_areas JSONB,
  p_first_goal JSONB DEFAULT NULL,
  p_first_task JSONB DEFAULT NULL
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

    -- 4. First Task 생성 (Goal이 있을 때만)
    IF p_first_task IS NOT NULL AND p_first_task->>'name' IS NOT NULL AND v_goal_id IS NOT NULL THEN
      INSERT INTO tasks (user_id, goal_id, name, repeat_type, time_slot, sort_order)
      VALUES (
        p_user_id,
        v_goal_id,
        p_first_task->>'name',
        'daily',
        'anytime',
        'a0'
      );
    END IF;
  END IF;

  -- 5. 프로필 온보딩 완료 표시
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
