// Reflection Repository
// Phase 4.5: API Design & Server Actions

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError, isNotFoundError, now } from './base.repository'
import type {
  DailyReflection,
  CreateReflectionInput,
  UpdateReflectionInput,
} from '@/types/entities'

export const reflectionRepository = {
  /**
   * 날짜별 Reflection 조회
   */
  async getByDate(
    supabase: TypedSupabaseClient,
    userId: string,
    date: string
  ): Promise<DailyReflection | null> {
    const { data, error } = await supabase
      .from('daily_reflections')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single()

    if (error) {
      if (isNotFoundError(error)) return null
      handleSupabaseError(error)
    }

    return data as DailyReflection
  },

  /**
   * 기간별 Reflection 조회
   */
  async getByDateRange(
    supabase: TypedSupabaseClient,
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyReflection[]> {
    const { data, error } = await supabase
      .from('daily_reflections')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) handleSupabaseError(error)
    return (data ?? []) as DailyReflection[]
  },

  /**
   * Reflection 생성
   */
  async create(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateReflectionInput
  ): Promise<DailyReflection> {
    const { data, error } = await supabase
      .from('daily_reflections')
      .insert({
        user_id: userId,
        date: input.date,
        mood: input.mood ?? null,
        summary: input.summary ?? null,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as DailyReflection
  },

  /**
   * Reflection 수정
   */
  async update(
    supabase: TypedSupabaseClient,
    id: string,
    userId: string,
    input: UpdateReflectionInput
  ): Promise<DailyReflection> {
    const { data, error } = await supabase
      .from('daily_reflections')
      .update({
        ...input,
        updated_at: now(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as DailyReflection
  },

  /**
   * Reflection 삭제
   */
  async delete(supabase: TypedSupabaseClient, id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('daily_reflections')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) handleSupabaseError(error)
  },

  /**
   * 날짜로 Upsert — native Supabase upsert (단일 쿼리)
   */
  async upsert(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateReflectionInput
  ): Promise<DailyReflection> {
    const { data, error } = await supabase
      .from('daily_reflections')
      .upsert(
        {
          user_id: userId,
          date: input.date,
          mood: input.mood ?? null,
          summary: input.summary ?? null,
          updated_at: now(),
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as DailyReflection
  },
}
