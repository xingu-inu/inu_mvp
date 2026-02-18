// Monthly Reflection Repository
// Phase 9: Review Screen — Monthly one-line reflection

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError, isNotFoundError, now } from './base.repository'
import type {
  MonthlyReflection,
  CreateMonthlyReflectionInput,
  UpdateMonthlyReflectionInput,
} from '@/types/entities'

export const monthlyReflectionRepository = {
  /**
   * 월별 Monthly Reflection 조회
   */
  async getByMonthStart(
    supabase: TypedSupabaseClient,
    userId: string,
    monthStart: string
  ): Promise<MonthlyReflection | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('monthly_reflections')
      .select('*')
      .eq('user_id', userId)
      .eq('month_start', monthStart)
      .single()

    if (error) {
      if (isNotFoundError(error)) return null
      handleSupabaseError(error)
    }

    return data as MonthlyReflection
  },

  /**
   * Monthly Reflection 생성
   */
  async create(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateMonthlyReflectionInput
  ): Promise<MonthlyReflection> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('monthly_reflections')
      .insert({
        user_id: userId,
        month_start: input.month_start,
        summary: input.summary ?? null,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as MonthlyReflection
  },

  /**
   * Monthly Reflection 수정
   */
  async update(
    supabase: TypedSupabaseClient,
    id: string,
    userId: string,
    input: UpdateMonthlyReflectionInput
  ): Promise<MonthlyReflection> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('monthly_reflections')
      .update({
        ...input,
        updated_at: now(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as MonthlyReflection
  },

  /**
   * Upsert — native Supabase upsert (단일 쿼리)
   */
  async upsert(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateMonthlyReflectionInput
  ): Promise<MonthlyReflection> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('monthly_reflections')
      .upsert(
        {
          user_id: userId,
          month_start: input.month_start,
          summary: input.summary ?? null,
          updated_at: now(),
        },
        { onConflict: 'user_id,month_start' }
      )
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as MonthlyReflection
  },
}
