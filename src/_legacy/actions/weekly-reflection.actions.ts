'use server'

import { authAction, validate } from '@/lib/security'
import { weeklyReflectionRepository } from '@/repositories/weekly-reflection.repository'
import { successResponse } from '@/lib/api'
import { weeklyReflectionSchema } from '@/lib/validations'

import type { WeeklyReflection, CreateWeeklyReflectionInput, ApiResponse } from '@/types'

/**
 * 주별 Weekly Reflection 조회
 */
export const getWeeklyReflection = authAction(
  'getWeeklyReflection',
  async ({ supabase, user }, weekStart: string): Promise<ApiResponse<WeeklyReflection | null>> => {
    const reflection = await weeklyReflectionRepository.getByWeekStart(supabase, user.id, weekStart)
    return successResponse(reflection)
  }
)

/**
 * Weekly Reflection 저장 (Upsert)
 */
export const saveWeeklyReflection = authAction(
  'saveWeeklyReflection',
  async (
    { supabase, user },
    input: CreateWeeklyReflectionInput
  ): Promise<ApiResponse<WeeklyReflection>> => {
    const v = validate(weeklyReflectionSchema, input)
    if (!v.success) return v.response

    const reflection = await weeklyReflectionRepository.upsert(supabase, user.id, v.data)

    return successResponse(reflection)
  }
)
