// Chat Repository
// AI 코치 대화 내역 저장/조회

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type { ChatConversation, ChatMessage } from '@/types/entities'

export const chatRepository = {
  /**
   * 대화 소유권 확인 — 해당 conversation이 userId 소유인지 검증
   * @returns true if owned, false otherwise
   */
  async verifyOwnership(
    supabase: TypedSupabaseClient,
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) return false
    return data !== null
  },

  /**
   * 대화 목록 조회 (최신순 50개)
   */
  async getConversations(
    supabase: TypedSupabaseClient,
    userId: string
  ): Promise<ChatConversation[]> {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) handleSupabaseError(error)
    return (data ?? []) as ChatConversation[]
  },

  /**
   * 대화 메시지 조회 (시간순)
   */
  async getMessages(supabase: TypedSupabaseClient, conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) handleSupabaseError(error)
    return (data ?? []) as ChatMessage[]
  },

  /**
   * 새 대화 생성
   */
  async createConversation(
    supabase: TypedSupabaseClient,
    userId: string,
    title?: string,
    relatedGoalId?: string,
    relatedTaskId?: string
  ): Promise<ChatConversation> {
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: userId,
        title: title ?? '새 대화',
        related_goal_id: relatedGoalId ?? null,
        related_task_id: relatedTaskId ?? null,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as ChatConversation
  },

  /**
   * 메시지 추가 + 첫 유저 메시지로 대화 title 업데이트
   */
  async addMessage(
    supabase: TypedSupabaseClient,
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)

    // 첫 유저 메시지일 때만 title 업데이트 (기본값 '새 대화'인 경우)
    if (role === 'user') {
      await supabase
        .from('chat_conversations')
        .update({
          title: content.slice(0, 50),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('title', '새 대화')
    }

    // updated_at 갱신 (title이 이미 변경된 대화도 최신 순서에 반영)
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    return data as ChatMessage
  },

  /**
   * 대화 삭제 (cascade로 메시지도 삭제)
   */
  async deleteConversation(
    supabase: TypedSupabaseClient,
    conversationId: string,
    userId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId)

    if (error) handleSupabaseError(error)
  },
}
