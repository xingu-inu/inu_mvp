'use server'

import { authAction } from '@/lib/security'
import { aiMessageRepository } from '@/repositories'
import { successResponse, listResponse } from '@/lib/api'

import type { AIMessage, ApiResponse, ApiListResult } from '@/types'

/**
 * 모든 AI 메시지 조회
 */
export const getAllMessages = authAction(
  'getAllMessages',
  async ({ supabase, user }): Promise<ApiListResult<AIMessage>> => {
    const messages = await aiMessageRepository.getAll(supabase, user.id)
    return listResponse(messages)
  }
)

/**
 * 읽지 않은 메시지 조회
 */
export const getUnreadMessages = authAction(
  'getUnreadMessages',
  async ({ supabase, user }): Promise<ApiListResult<AIMessage>> => {
    const messages = await aiMessageRepository.getUnread(supabase, user.id)
    return listResponse(messages)
  }
)

/**
 * 읽지 않은 메시지 개수 조회
 */
export const getUnreadCount = authAction(
  'getUnreadCount',
  async ({ supabase, user }): Promise<ApiResponse<number>> => {
    const count = await aiMessageRepository.getUnreadCount(supabase, user.id)
    return successResponse(count)
  }
)

/**
 * 메시지 읽음 처리
 */
export const markAsRead = authAction(
  'markAsRead',
  async ({ supabase, user }, id: string): Promise<ApiResponse<void>> => {
    await aiMessageRepository.markAsRead(supabase, id, user.id)
    return successResponse(undefined)
  }
)

/**
 * 모든 메시지 읽음 처리
 */
export const markAllAsRead = authAction(
  'markAllAsRead',
  async ({ supabase, user }): Promise<ApiResponse<void>> => {
    await aiMessageRepository.markAllAsRead(supabase, user.id)
    return successResponse(undefined)
  }
)
