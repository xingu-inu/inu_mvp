// Weekly Reflection Repository
// Review Screen — Weekly 3-column structured reflection

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError, isNotFoundError, now } from './base.repository'
import type {
  WeeklyReflection,
  CreateWeeklyReflectionInput,
  UpdateWeeklyReflectionInput,
} from '@/types/entities'

export const weeklyReflectionRepository = {
  /**
   * 주별 Weekly Reflection 조회
   */
  async getByWeekStart(
    supabase: TypedSupabaseClient,
    userId: string,
    weekStart: string
  ): Promise<WeeklyReflection | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('weekly_reflections')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .single()

    if (error) {
      if (isNotFoundError(error)) return null
      handleSupabaseError(error)
    }

    return data as WeeklyReflection
  },

  /**
   * Weekly Reflection 생성
   */
  async create(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateWeeklyReflectionInput
  ): Promise<WeeklyReflection> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('weekly_reflections')
      .insert({
        user_id: userId,
        week_start: input.week_start,
        highlight: input.highlight ?? null,
        challenge: input.challenge ?? null,
        next_focus: input.next_focus ?? null,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as WeeklyReflection
  },

  /**
   * Weekly Reflection 수정
   */
  async update(
    supabase: TypedSupabaseClient,
    id: string,
    userId: string,
    input: UpdateWeeklyReflectionInput
  ): Promise<WeeklyReflection> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('weekly_reflections')
      .update({
        ...input,
        updated_at: now(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as WeeklyReflection
  },

  /**
   * Upsert — native Supabase upsert (단일 쿼리)
   */
  async upsert(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateWeeklyReflectionInput
  ): Promise<WeeklyReflection> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('weekly_reflections')
      .upsert(
        {
          user_id: userId,
          week_start: input.week_start,
          highlight: input.highlight ?? null,
          challenge: input.challenge ?? null,
          next_focus: input.next_focus ?? null,
          updated_at: now(),
        },
        { onConflict: 'user_id,week_start' }
      )
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as WeeklyReflection
  },
}
