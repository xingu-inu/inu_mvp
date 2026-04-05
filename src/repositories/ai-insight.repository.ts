// AI Insight Repository
// AI-generated insights stored as user profile data

import { generateKeyBetween } from 'fractional-indexing'
import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError, now, isValidFractionalKey, batchReorder } from './base.repository'
import type { AiInsight, CreateAiInsightInput, UpdateAiInsightInput } from '@/types/entities'

// The ai_insights table may not yet exist in generated DB types.
// Use an untyped .from() helper until `npm run db:types` is re-run.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (supabase: TypedSupabaseClient, table: string) => (supabase as any).from(table)

export const aiInsightRepository = {
  /**
   * 사용자의 모든 AI 인사이트 조회
   */
  async getByUser(supabase: TypedSupabaseClient, userId: string): Promise<AiInsight[]> {
    const { data, error } = await from(supabase, 'ai_insights')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) handleSupabaseError(error)
    return (data ?? []) as AiInsight[]
  },

  /**
   * AI 인사이트 생성
   */
  async create(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateAiInsightInput
  ): Promise<AiInsight> {
    // 마지막 sort_order 조회
    const { data: lastInsight } = await from(supabase, 'ai_insights')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const lastKey =
      lastInsight?.sort_order && isValidFractionalKey(lastInsight.sort_order)
        ? lastInsight.sort_order
        : null
    const newSortOrder = generateKeyBetween(lastKey, null)

    const { data, error } = await from(supabase, 'ai_insights')
      .insert({
        user_id: userId,
        title: input.title,
        description: input.description,
        sort_order: newSortOrder,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as AiInsight
  },

  /**
   * AI 인사이트 수정
   */
  async update(
    supabase: TypedSupabaseClient,
    id: string,
    input: UpdateAiInsightInput
  ): Promise<AiInsight> {
    const { data, error } = await from(supabase, 'ai_insights')
      .update({ ...input, updated_at: now() })
      .eq('id', id)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as AiInsight
  },

  /**
   * AI 인사이트 삭제
   */
  async delete(supabase: TypedSupabaseClient, id: string): Promise<void> {
    const { error } = await from(supabase, 'ai_insights').delete().eq('id', id)

    if (error) handleSupabaseError(error)
  },

  /**
   * AI 인사이트 순서 변경
   */
  async reorder(supabase: TypedSupabaseClient, orderedIds: string[]): Promise<void> {
    await batchReorder(supabase, 'ai_insights', orderedIds)
  },
}
