'use server'

import { authAction, validate } from '@/lib/security'
import { reflectionRepository } from '@/repositories'
import { successResponse, listResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { createReflectionSchema, updateReflectionSchema } from '@/lib/validations'

import type {
  DailyReflection,
  CreateReflectionInput,
  UpdateReflectionInput,
  ApiResponse,
  ApiListResult,
} from '@/types'

const NOT_FOUND_ERROR_MAP = {
  NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: 'Reflection을 찾을 수 없습니다.' },
} as const

/**
 * 날짜별 Reflection 조회
 */
export const getDailyReflection = authAction(
  'getDailyReflection',
  async ({ supabase, user }, date: string): Promise<ApiResponse<DailyReflection | null>> => {
    const reflection = await reflectionRepository.getByDate(supabase, user.id, date)
    return successResponse(reflection)
  }
)

/**
 * 기간별 Reflection 조회
 */
export const getReflectionsByDateRange = authAction(
  'getReflectionsByDateRange',
  async (
    { supabase, user },
    startDate: string,
    endDate: string
  ): Promise<ApiListResult<DailyReflection>> => {
    const reflections = await reflectionRepository.getByDateRange(
      supabase,
      user.id,
      startDate,
      endDate
    )
    return listResponse(reflections)
  }
)

/**
 * Reflection 생성
 */
export const createReflection = authAction(
  'createReflection',
  async (
    { supabase, user },
    input: CreateReflectionInput
  ): Promise<ApiResponse<DailyReflection>> => {
    const v = validate(createReflectionSchema, input)
    if (!v.success) return v.response

    // Upsert 사용 (날짜별 하나만 존재)
    const reflection = await reflectionRepository.upsert(supabase, user.id, v.data)

    return successResponse(reflection)
  }
)

/**
 * Reflection 수정
 */
export const updateReflection = authAction(
  'updateReflection',
  async (
    { supabase, user },
    id: string,
    input: UpdateReflectionInput
  ): Promise<ApiResponse<DailyReflection>> => {
    const v = validate(updateReflectionSchema, input)
    if (!v.success) return v.response

    const reflection = await reflectionRepository.update(supabase, id, user.id, v.data)

    return successResponse(reflection)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)

/**
 * Reflection 삭제
 */
export const deleteReflection = authAction(
  'deleteReflection',
  async ({ supabase, user }, id: string): Promise<ApiResponse<void>> => {
    await reflectionRepository.delete(supabase, id, user.id)

    return successResponse(undefined)
  },
  { errorMap: NOT_FOUND_ERROR_MAP }
)
