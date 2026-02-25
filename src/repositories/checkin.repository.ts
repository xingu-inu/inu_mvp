// CheckIn Repository
// Phase 4.5: API Design & Server Actions

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type { CheckIn, CheckInStatus, CreateCheckInInput, CheckInResult } from '@/types/entities'

export const checkinRepository = {
  /**
   * 날짜별 CheckIn 조회
   */
  async getByDate(supabase: TypedSupabaseClient, userId: string, date: string): Promise<CheckIn[]> {
    const { data, error } = await supabase
      .from('check_ins')
      .select(
        `
        *,
        task:tasks(id, name, goal_id)
      `
      )
      .eq('user_id', userId)
      .eq('date', date)

    if (error) handleSupabaseError(error)
    return (data ?? []) as CheckIn[]
  },

  /**
   * Task별 CheckIn 조회 (최근 N개)
   */
  async getByTask(
    supabase: TypedSupabaseClient,
    userId: string,
    taskId: string,
    limit = 30
  ): Promise<CheckIn[]> {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit)

    if (error) handleSupabaseError(error)
    return (data ?? []) as CheckIn[]
  },

  /**
   * CheckIn 생성 (RPC 사용 - streak 자동 계산)
   * - Phase 3에서 정의된 create_checkin_with_streak 호출
   */
  async create(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateCheckInInput
  ): Promise<CheckInResult> {
    const { data, error } = await supabase.rpc('create_checkin_with_streak', {
      p_task_id: input.task_id,
      p_status: input.status,
      p_note: input.note ?? undefined,
    })

    if (error) handleSupabaseError(error)
    return data as unknown as CheckInResult
  },

  /**
   * CheckIn 수정 (status 변경)
   */
  async update(
    supabase: TypedSupabaseClient,
    id: string,
    userId: string,
    status: CheckInStatus,
    note?: string
  ): Promise<CheckIn> {
    const updateData: Record<string, unknown> = { status }
    if (note !== undefined) {
      updateData.note = note
    }

    const { data, error } = await supabase
      .from('check_ins')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as CheckIn
  },

  /**
   * CheckIn 삭제 (Undo)
   */
  async delete(supabase: TypedSupabaseClient, id: string, userId: string): Promise<void> {
    const { error } = await supabase.from('check_ins').delete().eq('id', id).eq('user_id', userId)

    if (error) handleSupabaseError(error)
  },

  /**
   * Streak 정보 조회
   */
  async getStreakInfo(
    supabase: TypedSupabaseClient,
    userId: string,
    taskId: string
  ): Promise<{ current: number; best: number }> {
    const { data, error } = await supabase
      .from('tasks')
      .select('streak_count, best_streak')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single()

    if (error) handleSupabaseError(error)

    return {
      current: data?.streak_count ?? 0,
      best: data?.best_streak ?? 0,
    }
  },
}
