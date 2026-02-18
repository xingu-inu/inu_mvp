// Feedback Repository
// User feedback data access

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'

export type FeedbackCategory = 'general' | 'bug' | 'feature' | 'improvement'
export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved'

export interface Feedback {
  id: string
  user_id: string
  category: FeedbackCategory
  content: string
  status: FeedbackStatus
  admin_note: string | null
  created_at: string
  // Joined fields (admin list)
  user?: {
    email: string
    name: string | null
  }
}

export interface CreateFeedbackInput {
  user_id: string
  category: FeedbackCategory
  content: string
}

export interface UpdateFeedbackStatusInput {
  status: FeedbackStatus
  admin_note?: string
}

// Note: Table 'feedbacks' not yet in generated database.ts — cast required until `db:types` is run
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFrom = any

export const feedbackRepository = {
  /**
   * 피드백 생성 (사용자용)
   */
  async create(supabase: TypedSupabaseClient, input: CreateFeedbackInput): Promise<Feedback> {
    const { data, error } = await (supabase.from as AnyFrom)('feedbacks')
      .insert({
        user_id: input.user_id,
        category: input.category,
        content: input.content,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as unknown as Feedback
  },

  /**
   * 내 피드백 목록 조회 (사용자용)
   */
  async listByUser(supabase: TypedSupabaseClient, userId: string): Promise<Feedback[]> {
    const { data, error } = await (supabase.from as AnyFrom)('feedbacks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as Feedback[]
  },

  /**
   * 전체 피드백 목록 조회 (관리자용, 사용자 정보 조인)
   */
  async listAll(
    supabase: TypedSupabaseClient,
    params: { status?: FeedbackStatus; page?: number; pageSize?: number }
  ): Promise<{ feedbacks: Feedback[]; total: number }> {
    const { status, page = 1, pageSize = 20 } = params
    const offset = (page - 1) * pageSize

    let query = (supabase.from as AnyFrom)('feedbacks')
      .select('*, user:profiles!feedbacks_user_id_fkey(email, name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query
    if (error) handleSupabaseError(error)

    return { feedbacks: (data ?? []) as unknown as Feedback[], total: count ?? 0 }
  },

  /**
   * 피드백 상태 업데이트 (관리자용)
   */
  async updateStatus(
    supabase: TypedSupabaseClient,
    id: string,
    input: UpdateFeedbackStatusInput
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status: input.status }
    if (input.admin_note !== undefined) {
      updateData.admin_note = input.admin_note
    }

    const { error } = await (supabase.from as AnyFrom)('feedbacks').update(updateData).eq('id', id)

    if (error) handleSupabaseError(error)
  },
}
