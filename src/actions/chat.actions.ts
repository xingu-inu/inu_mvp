'use server'

import { authAction } from '@/lib/security'
import { chatRepository } from '@/repositories'
import { successResponse, errorResponse, listResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'

import type { ChatConversation, ChatMessage, ApiResponse, ApiListResult } from '@/types'

/**
 * 대화 목록 조회
 */
export const getChatConversations = authAction(
  'getChatConversations',
  async ({ supabase, user }): Promise<ApiListResult<ChatConversation>> => {
    const conversations = await chatRepository.getConversations(supabase, user.id)
    return listResponse(conversations)
  }
)

/**
 * 대화 메시지 조회
 */
export const getChatMessages = authAction(
  'getChatMessages',
  async ({ supabase, user }, conversationId: string): Promise<ApiListResult<ChatMessage>> => {
    // Defense-in-depth: verify conversation ownership at app layer (RLS also enforces)
    const isOwner = await chatRepository.verifyOwnership(supabase, conversationId, user.id)
    if (!isOwner) return errorResponse(ErrorCode.AUTH_FORBIDDEN) as ApiListResult<ChatMessage>

    const messages = await chatRepository.getMessages(supabase, conversationId)
    return listResponse(messages)
  }
)

/**
 * 새 대화 생성
 */
export const createChatConversation = authAction(
  'createChatConversation',
  async ({ supabase, user }, title?: string): Promise<ApiResponse<ChatConversation>> => {
    const conversation = await chatRepository.createConversation(supabase, user.id, title)
    return successResponse(conversation)
  }
)

/**
 * 메시지 저장
 */
export const saveChatMessage = authAction(
  'saveChatMessage',
  async (
    { supabase, user },
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<ApiResponse<ChatMessage>> => {
    // Defense-in-depth: verify conversation ownership at app layer (RLS also enforces)
    const isOwner = await chatRepository.verifyOwnership(supabase, conversationId, user.id)
    if (!isOwner) return errorResponse(ErrorCode.AUTH_FORBIDDEN)

    const message = await chatRepository.addMessage(supabase, conversationId, role, content)
    return successResponse(message)
  }
)

/**
 * 대화 삭제
 */
export const deleteChatConversation = authAction(
  'deleteChatConversation',
  async ({ supabase, user }, conversationId: string): Promise<ApiResponse<void>> => {
    await chatRepository.deleteConversation(supabase, conversationId, user.id)
    return successResponse(undefined)
  }
)
