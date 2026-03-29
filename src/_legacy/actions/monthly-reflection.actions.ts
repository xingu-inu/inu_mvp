'use server'

import { authAction, validate } from '@/lib/security'
import { monthlyReflectionRepository } from '@/repositories/monthly-reflection.repository'
import { successResponse } from '@/lib/api'
import { monthlyReflectionSchema } from '@/lib/validations'

import type { MonthlyReflection, CreateMonthlyReflectionInput, ApiResponse } from '@/types'

/**
 * 월별 Monthly Reflection 조회
 */
export const getMonthlyReflection = authAction(
  'getMonthlyReflection',
  async (
    { supabase, user },
    monthStart: string
  ): Promise<ApiResponse<MonthlyReflection | null>> => {
    const reflection = await monthlyReflectionRepository.getByMonthStart(
      supabase,
      user.id,
      monthStart
    )
    return successResponse(reflection)
  }
)

/**
 * Monthly Reflection 저장 (Upsert)
 */
export const saveMonthlyReflection = authAction(
  'saveMonthlyReflection',
  async (
    { supabase, user },
    input: CreateMonthlyReflectionInput
  ): Promise<ApiResponse<MonthlyReflection>> => {
    const v = validate(monthlyReflectionSchema, input)
    if (!v.success) return v.response

    const reflection = await monthlyReflectionRepository.upsert(supabase, user.id, v.data)

    return successResponse(reflection)
  }
)
