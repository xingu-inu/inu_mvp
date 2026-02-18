// AI Message Repository
// Phase 4.5: API Design & Server Actions

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type { AIMessage, MessageType } from '@/types/entities'

export const aiMessageRepository = {
  /**
   * 모든 AI 메시지 조회
   */
  async getAll(supabase: TypedSupabaseClient, userId: string): Promise<AIMessage[]> {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return (data ?? []) as AIMessage[]
  },

  /**
   * 읽지 않은 메시지만 조회
   */
  async getUnread(supabase: TypedSupabaseClient, userId: string): Promise<AIMessage[]> {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return (data ?? []) as AIMessage[]
  },

  /**
   * AI 메시지 생성
   */
  async create(
    supabase: TypedSupabaseClient,
    userId: string,
    input: {
      type: MessageType
      title: string
      content: string
      relatedGoalId?: string
      relatedTaskId?: string
    }
  ): Promise<AIMessage> {
    const { data, error } = await supabase
      .from('ai_messages')
      .insert({
        user_id: userId,
        type: input.type,
        title: input.title,
        content: input.content,
        related_goal_id: input.relatedGoalId ?? null,
        related_task_id: input.relatedTaskId ?? null,
        is_read: false,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as AIMessage
  },

  /**
   * 메시지 읽음 처리
   */
  async markAsRead(supabase: TypedSupabaseClient, id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_messages')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) handleSupabaseError(error)
  },

  /**
   * 모든 메시지 읽음 처리
   */
  async markAllAsRead(supabase: TypedSupabaseClient, userId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_messages')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) handleSupabaseError(error)
  },

  /**
   * 읽지 않은 메시지 개수
   */
  async getUnreadCount(supabase: TypedSupabaseClient, userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('ai_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) handleSupabaseError(error)
    return count ?? 0
  },
}
