'use server'

import { authAction, validate } from '@/lib/security'
import { goalReflectionRepository } from '@/repositories/goal-reflection.repository'
import { successResponse } from '@/lib/api'
import { goalReflectionSchema } from '@/lib/validations'
import type { GoalReflection, CreateGoalReflectionInput, ApiResponse } from '@/types'

/**
 * 특정 Goal + 기간의 회고 조회
 */
export const getGoalReflection = authAction(
  'getGoalReflection',
  async (
    { supabase, user },
    { goalId, periodStart, periodEnd }: { goalId: string; periodStart: string; periodEnd: string }
  ): Promise<ApiResponse<GoalReflection | null>> => {
    const reflection = await goalReflectionRepository.getByGoalAndPeriod(
      supabase,
      user.id,
      goalId,
      periodStart,
      periodEnd
    )
    return successResponse(reflection)
  }
)

/**
 * 특정 기간의 모든 Goal 회고 조회
 */
export const getGoalReflections = authAction(
  'getGoalReflections',
  async (
    { supabase, user },
    { periodStart, periodEnd }: { periodStart: string; periodEnd: string }
  ): Promise<ApiResponse<GoalReflection[]>> => {
    const reflections = await goalReflectionRepository.getByPeriod(
      supabase,
      user.id,
      periodStart,
      periodEnd
    )
    return successResponse(reflections)
  }
)

/**
 * Goal 회고 저장 (Upsert)
 */
export const saveGoalReflection = authAction(
  'saveGoalReflection',
  async (
    { supabase, user },
    input: CreateGoalReflectionInput
  ): Promise<ApiResponse<GoalReflection>> => {
    const v = validate(goalReflectionSchema, input)
    if (!v.success) return v.response

    const reflection = await goalReflectionRepository.upsert(supabase, user.id, v.data)
    return successResponse(reflection)
  }
)
