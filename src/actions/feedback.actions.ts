'use server'

import { authAction, adminAction } from '@/lib/security'
import { successResponse, listResponse } from '@/lib/api'
import { feedbackRepository } from '@/repositories'
import type { Feedback, FeedbackStatus } from '@/repositories/feedback.repository'
import type { ApiResponse, ApiListResult } from '@/types/api'

/**
 * 피드백 제출 (인증된 사용자용)
 */
export const submitFeedback = authAction(
  'submitFeedback',
  async (
    { supabase, user },
    input: {
      category: 'general' | 'bug' | 'feature' | 'improvement'
      content: string
    }
  ): Promise<ApiResponse<Feedback>> => {
    const feedback = await feedbackRepository.create(supabase, {
      user_id: user.id,
      category: input.category,
      content: input.content,
    })
    return successResponse(feedback)
  }
)

/**
 * 내 피드백 목록 조회 (사용자용)
 */
export const getMyFeedbacks = authAction(
  'getMyFeedbacks',
  async ({ supabase, user }): Promise<ApiResponse<Feedback[]>> => {
    const feedbacks = await feedbackRepository.listByUser(supabase, user.id)
    return successResponse(feedbacks)
  }
)

/**
 * 전체 피드백 목록 조회 (관리자용)
 */
export const getAdminFeedbacks = adminAction(
  'getAdminFeedbacks',
  async (
    { supabase },
    params: {
      status?: FeedbackStatus
      page?: number
      pageSize?: number
    }
  ): Promise<ApiListResult<Feedback>> => {
    const { feedbacks, total } = await feedbackRepository.listAll(supabase, params)
    return listResponse(feedbacks, {
      total,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    })
  }
)

/**
 * 피드백 상태 업데이트 (관리자용)
 */
export const updateFeedbackStatus = adminAction(
  'updateFeedbackStatus',
  async (
    { supabase },
    id: string,
    input: { status: FeedbackStatus; admin_note?: string }
  ): Promise<ApiResponse<void>> => {
    await feedbackRepository.updateStatus(supabase, id, input)
    return successResponse(undefined)
  }
)
