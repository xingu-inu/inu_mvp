'use server'

import { authAction, validate } from '@/lib/security'
import { aiInsightRepository } from '@/repositories'
import { successResponse, errorResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { createAiInsightSchema, updateAiInsightSchema } from '@/lib/validations'

import type { AiInsight, CreateAiInsightInput, UpdateAiInsightInput, ApiResponse } from '@/types'

const MAX_AI_INSIGHTS = 50

/**
 * AI 인사이트 전체 조회
 */
export const getAiInsights = authAction(
  'getAiInsights',
  async ({ supabase, user }): Promise<ApiResponse<AiInsight[]>> => {
    const insights = await aiInsightRepository.getByUser(supabase, user.id)
    return successResponse(insights)
  }
)

/**
 * AI 인사이트 생성
 */
export const createAiInsight = authAction(
  'createAiInsight',
  async ({ supabase, user }, input: CreateAiInsightInput): Promise<ApiResponse<AiInsight>> => {
    const v = validate(createAiInsightSchema, input)
    if (!v.success) return v.response

    const existing = await aiInsightRepository.getByUser(supabase, user.id)
    if (existing.length >= MAX_AI_INSIGHTS) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        `최대 ${MAX_AI_INSIGHTS}개까지 추가할 수 있습니다.`
      )
    }

    const insight = await aiInsightRepository.create(supabase, user.id, v.data)
    return successResponse(insight)
  }
)

/**
 * AI 인사이트 수정
 */
export const updateAiInsight = authAction(
  'updateAiInsight',
  async (
    { supabase },
    id: string,
    input: UpdateAiInsightInput
  ): Promise<ApiResponse<AiInsight>> => {
    const v = validate(updateAiInsightSchema, input)
    if (!v.success) return v.response

    const insight = await aiInsightRepository.update(supabase, id, v.data)
    return successResponse(insight)
  },
  {
    errorMap: { NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: '인사이트를 찾을 수 없습니다.' } },
  }
)

/**
 * AI 인사이트 삭제
 */
export const deleteAiInsight = authAction(
  'deleteAiInsight',
  async ({ supabase }, id: string): Promise<ApiResponse<void>> => {
    await aiInsightRepository.delete(supabase, id)
    return successResponse(undefined)
  },
  {
    errorMap: { NOT_FOUND: { code: ErrorCode.NOT_FOUND, message: '인사이트를 찾을 수 없습니다.' } },
  }
)
