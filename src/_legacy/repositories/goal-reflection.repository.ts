// Goal Reflection Repository
// Review Screen - Goal 단위 회고

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError, isNotFoundError, now } from './base.repository'
import type { GoalReflection, CreateGoalReflectionInput } from '@/types/entities'

export const goalReflectionRepository = {
  /**
   * 특정 Goal + 기간의 회고 조회
   */
  async getByGoalAndPeriod(
    supabase: TypedSupabaseClient,
    userId: string,
    goalId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<GoalReflection | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('goal_reflections')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .single()

    if (error) {
      if (isNotFoundError(error)) return null
      handleSupabaseError(error)
    }
    return data as GoalReflection
  },

  /**
   * 특정 기간의 모든 Goal 회고 조회
   */
  async getByPeriod(
    supabase: TypedSupabaseClient,
    userId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<GoalReflection[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('goal_reflections')
      .select('*')
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)

    if (error) handleSupabaseError(error)
    return (data ?? []) as GoalReflection[]
  },

  /**
   * Goal 회고 Upsert (단일 쿼리)
   */
  async upsert(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateGoalReflectionInput
  ): Promise<GoalReflection> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('goal_reflections')
      .upsert(
        {
          user_id: userId,
          goal_id: input.goal_id,
          period_start: input.period_start,
          period_end: input.period_end,
          summary: input.summary ?? null,
          progress_feeling: input.progress_feeling ?? null,
          next_focus: input.next_focus ?? null,
          why_temperature: input.why_temperature ?? null,
          updated_at: now(),
        },
        { onConflict: 'goal_id,period_start,period_end' }
      )
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as GoalReflection
  },
}
