-- ============================================
-- complete_onboarding — V3 brain-dump 배열 처리 추가
-- V3 모드에서 p_first_goal이 배열로 전달될 때
-- 각 goal을 areaType으로 매칭하여 생성
-- V2 단일 goal 모드는 기존 로직 유지
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
  v_area_id UUID;
  v_goal_rec RECORD;
  v_task_rec RECORD;
  v_goal_idx INT := 0;
  v_task_idx INT := 0;
  v_task_goal_id UUID;
  v_goal_name TEXT;
BEGIN
  -- 1. Direction: 기존 active direction이 있으면 업데이트, 없으면 생성
  SELECT id INTO v_direction_id
  FROM directions
  WHERE user_id = p_user_id AND status = 'active';

  IF v_direction_id IS NOT NULL THEN
    UPDATE directions
    SET statement = p_direction->>'statement',
        why = p_direction->>'why',
        updated_at = NOW()
    WHERE id = v_direction_id;
  ELSE
    INSERT INTO directions (user_id, statement, why, status, version)
    VALUES (
      p_user_id,
      p_direction->>'statement',
      p_direction->>'why',
      'active',
      1
    )
    RETURNING id INTO v_direction_id;
  END IF;

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

  -- 3. Goals/Tasks 처리
  IF p_first_goal IS NOT NULL THEN
    IF jsonb_typeof(p_first_goal) = 'array' THEN
      -- === V3 배열 모드: goals 배열 순회 ===
      FOR v_goal_rec IN SELECT value FROM jsonb_array_elements(p_first_goal) LOOP
        -- Area 매칭: areaType → areas.type
        -- 'custom' areaType 또는 매칭 실패 → v_first_area_id 폴백
        v_area_id := NULL;
        SELECT id INTO v_area_id FROM areas
          WHERE user_id = p_user_id
            AND direction_id = v_direction_id
            AND type = (v_goal_rec.value->>'areaType')::area_type
          ORDER BY sort_order
          LIMIT 1;

        INSERT INTO goals (user_id, area_id, name, why, status, sort_order)
        VALUES (
          p_user_id,
          COALESCE(v_area_id, v_first_area_id),
          v_goal_rec.value->>'name',
          v_goal_rec.value->>'why',
          COALESCE(v_goal_rec.value->>'status', 'active'),
          'a' || v_goal_idx
        )
        RETURNING id INTO v_goal_id;

        v_goal_idx := v_goal_idx + 1;
      END LOOP;

      -- V3 Tasks 배열 처리
      IF p_first_task IS NOT NULL AND jsonb_typeof(p_first_task) = 'array' THEN
        FOR v_task_rec IN SELECT value FROM jsonb_array_elements(p_first_task) LOOP
          v_goal_name := v_task_rec.value->>'goalName';

          -- 빈 문자열 또는 NULL goalName 스킵
          IF v_goal_name IS NOT NULL AND v_goal_name <> '' THEN
            -- 같은 트랜잭션 내 goals에서 매칭 (sort_order로 결정론적)
            v_task_goal_id := NULL;
            SELECT g.id INTO v_task_goal_id FROM goals g
              WHERE g.user_id = p_user_id
                AND g.name = v_goal_name
              ORDER BY g.sort_order
              LIMIT 1;

            IF v_task_goal_id IS NOT NULL THEN
              INSERT INTO tasks (user_id, goal_id, name, repeat_type, time_slot, sort_order)
              VALUES (
                p_user_id,
                v_task_goal_id,
                v_task_rec.value->>'name',
                'daily',
                'anytime',
                'a' || v_task_idx
              );
              v_task_idx := v_task_idx + 1;
            END IF;
          END IF;
        END LOOP;
      END IF;

    ELSIF p_first_goal->>'name' IS NOT NULL THEN
      -- === V2 단일 goal 모드 (기존 로직 유지) ===
      INSERT INTO goals (user_id, area_id, name, why, status)
      VALUES (
        p_user_id,
        v_first_area_id,
        p_first_goal->>'name',
        p_first_goal->>'why',
        'active'
      )
      RETURNING id INTO v_goal_id;

      -- V2 단일 task (기존 로직 유지)
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
