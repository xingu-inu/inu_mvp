'use server'

import { authAction, validate } from '@/lib/security'
import { goalRepository, statusHistoryRepository, activityLogRepository } from '@/repositories'
import { getActiveDirectionId } from '@/repositories/base.repository'
import { successResponse, listResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { createGoalSchema, updateGoalSchema } from '@/lib/validations'
import type { MinimalGoal, NotificationGoal } from '@/repositories/goal.repository'

import type {
  Goal,
  GoalStatus,
  CreateGoalInput,
  UpdateGoalInput,
  ApiResponse,
  ApiListResult,
} from '@/types'

const NOT_FOUND_ERROR_MAP = {
  NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: 'Goal을 찾을 수 없습니다.' },
} as const

/**
 * Active Goal 경량 조회 (notifications 전용)
 * groups/tasks join 없이 id, name, status, target_date만 반환
 */
export const getActiveGoalsMinimal = authAction(
  'getActiveGoalsMinimal',
  async ({ supabase, user }): Promise<ApiListResult<MinimalGoal>> => {
    const goals = await goalRepository.getActiveMinimal(supabase, user.id)
    return listResponse(goals)
  }
)

/**
 * Active Goal 확장 조회 (알림 시스템 전용)
 * updated_at, completed_at, task_count 포함
 */
export const getGoalsForNotifications = authAction(
  'getGoalsForNotifications',
  async ({ supabase, user }): Promise<ApiListResult<NotificationGoal>> => {
    const goals = await goalRepository.getForNotifications(supabase, user.id)
    return listResponse(goals)
  }
)

/**
 * 최근 완료된 Goal 조회 (Milestone 알림용)
 */
export const getRecentlyCompletedGoals = authAction(
  'getRecentlyCompletedGoals',
  async ({ supabase, user }): Promise<ApiListResult<NotificationGoal>> => {
    const goals = await goalRepository.getRecentlyCompleted(supabase, user.id)
    return listResponse(goals)
  }
)

/**
 * 사용자의 모든 Goal 조회
 * directionId를 1회 resolve 후 repository에 전달하여 중복 쿼리 방지
 */
export const getGoals = authAction(
  'getGoals',
  async ({ supabase, user }): Promise<ApiListResult<Goal>> => {
    const directionId = await getActiveDirectionId(supabase, user.id)
    const goals = await goalRepository.getAll(supabase, user.id, directionId)
    return listResponse(goals)
  }
)

/**
 * 상태별 Goal 조회
 */
export const getGoalsByStatus = authAction(
  'getGoalsByStatus',
  async ({ supabase, user }, status: GoalStatus): Promise<ApiListResult<Goal>> => {
    const directionId = await getActiveDirectionId(supabase, user.id)
    const goals = await goalRepository.getByStatus(supabase, user.id, status, directionId)
    return listResponse(goals)
  }
)

/**
 * Area별 Goal 조회
 */
export const getGoalsByArea = authAction(
  'getGoalsByArea',
  async ({ supabase, user }, areaId: string): Promise<ApiListResult<Goal>> => {
    const goals = await goalRepository.getByArea(supabase, areaId, user.id)
    return listResponse(goals)
  }
)

/**
 * Goal 상세 조회
 */
export const getGoalDetail = authAction(
  'getGoalDetail',
  async ({ supabase, user }, id: string): Promise<ApiResponse<Goal | null>> => {
    const goal = await goalRepository.getById(supabase, id, user.id)
    return successResponse(goal)
  }
)

/**
 * Goal 생성
 */
export const createGoal = authAction(
  'createGoal',
  async ({ supabase, user }, input: CreateGoalInput): Promise<ApiResponse<Goal>> => {
    const v = validate(createGoalSchema, input)
    if (!v.success) return v.response

    const goal = await goalRepository.create(supabase, user.id, v.data)

    await activityLogRepository.log(supabase, user.id, {
      entityType: 'goal',
      entityId: goal.id,
      action: 'created',
      entityName: goal.name,
      areaId: goal.area_id,
      goalId: goal.id,
    })

    return successResponse(goal)
  }
)

/**
 * Goal 수정
 */
export const updateGoal = authAction(
  'updateGoal',
  async ({ supabase, user }, id: string, input: UpdateGoalInput): Promise<ApiResponse<Goal>> => {
    const v = validate(updateGoalSchema, input)
    if (!v.success) return v.response

    // 활동 로그를 위해 before 스냅샷이 필요한 경우 (name / why 변경 감지) 또는
    // 기존 상태 히스토리 로직을 위해 상태가 바뀌는 경우 before를 한 번만 조회
    const wantsIdentityDiff = v.data.name !== undefined || v.data.why !== undefined
    const needsStatusHistory = !!v.data.status
    const before =
      wantsIdentityDiff || needsStatusHistory
        ? await goalRepository.getById(supabase, id, user.id)
        : null

    // 상태 변경 시 히스토리 기록 (기존 로직 유지)
    if (before && v.data.status && before.status !== v.data.status) {
      await statusHistoryRepository.insertGoalHistory(
        supabase,
        user.id,
        id,
        before.status,
        v.data.status,
        input.status_change_reason,
        input.status_change_note
      )
    }

    const goal = await goalRepository.update(supabase, id, user.id, v.data)

    if (before) {
      const nameChanged = v.data.name !== undefined && v.data.name !== before.name
      const whyChanged = v.data.why !== undefined && (v.data.why ?? '') !== (before.why ?? '')

      if (nameChanged) {
        await activityLogRepository.log(supabase, user.id, {
          entityType: 'goal',
          entityId: goal.id,
          action: 'renamed',
          entityName: goal.name,
          areaId: goal.area_id,
          goalId: goal.id,
          metadata: { from: before.name, to: goal.name },
        })
      }

      if (whyChanged) {
        await activityLogRepository.log(supabase, user.id, {
          entityType: 'goal',
          entityId: goal.id,
          action: 'why_updated',
          entityName: goal.name,
          areaId: goal.area_id,
          goalId: goal.id,
          metadata: { from: before.why ?? null, to: goal.why ?? null },
        })
      }
    }

    return successResponse(goal)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)

/**
 * Goal 상태 변경
 */
export const updateGoalStatus = authAction(
  'updateGoalStatus',
  async ({ supabase, user }, id: string, status: GoalStatus): Promise<ApiResponse<Goal>> => {
    // 현재 상태 조회 후 히스토리 기록
    const current = await goalRepository.getById(supabase, id, user.id)
    if (current && current.status !== status) {
      await statusHistoryRepository.insertGoalHistory(
        supabase,
        user.id,
        id,
        current.status,
        status,
        null,
        null
      )
    }

    const goal = await goalRepository.updateStatus(supabase, id, user.id, status)
    return successResponse(goal)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)

/**
 * Goal 삭제
 */
export const deleteGoal = authAction(
  'deleteGoal',
  async ({ supabase, user }, id: string): Promise<ApiResponse<void>> => {
    const before = await goalRepository.getById(supabase, id, user.id)

    await goalRepository.delete(supabase, id, user.id)

    if (before) {
      await activityLogRepository.log(supabase, user.id, {
        entityType: 'goal',
        entityId: id,
        action: 'deleted',
        entityName: before.name,
        areaId: before.area_id,
        goalId: id,
        metadata: { cascade: true },
      })
    }

    return successResponse(undefined)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)
