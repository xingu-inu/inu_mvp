'use server'

import { authAction, validate } from '@/lib/security'
import { goalRepository } from '@/repositories'
import { successResponse, listResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { createGoalSchema, updateGoalSchema } from '@/lib/validations'

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
 * 사용자의 모든 Goal 조회
 */
export const getGoals = authAction(
  'getGoals',
  async ({ supabase, user }): Promise<ApiListResult<Goal>> => {
    const goals = await goalRepository.getAll(supabase, user.id)
    return listResponse(goals)
  }
)

/**
 * 상태별 Goal 조회
 */
export const getGoalsByStatus = authAction(
  'getGoalsByStatus',
  async ({ supabase, user }, status: GoalStatus): Promise<ApiListResult<Goal>> => {
    const goals = await goalRepository.getByStatus(supabase, user.id, status)
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
