'use server'

import { authAction, validate } from '@/lib/security'
import { goalRepository, statusHistoryRepository } from '@/repositories'
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

    // 상태 변경 시 히스토리 기록
    if (v.data.status) {
      const current = await goalRepository.getById(supabase, id, user.id)
      if (current && current.status !== v.data.status) {
        await statusHistoryRepository.insertGoalHistory(
          supabase,
          user.id,
          id,
          current.status,
          v.data.status,
          input.status_change_reason,
          input.status_change_note
        )
      }
    }

    const goal = await goalRepository.update(supabase, id, user.id, v.data)
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
    await goalRepository.delete(supabase, id, user.id)
    return successResponse(undefined)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)
