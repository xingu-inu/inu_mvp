'use server'

import { authAction } from '@/lib/security'
import { listResponse, successResponse } from '@/lib/api'

import type { Enums } from '@/types/database'

type CheckinStatus = Enums<'checkin_status'>
import type { ApiListResult, ApiResponse } from '@/types/api'

export interface CheckinResult {
  checkinId: string
  newStreak: number
  bestStreak: number
}

/**
 * Create a check-in for a task and update streak
 * @param taskId - Task UUID
 * @param status - Check-in status (done, skip, miss)
 * @param date - Check-in date (YYYY-MM-DD), defaults to today in RPC
 * @param note - Optional note
 */
export const createCheckIn = authAction(
  'createCheckIn',
  async (
    { supabase },
    taskId: string,
    status: CheckinStatus,
    date?: string,
    note?: string
  ): Promise<ApiResponse<CheckinResult>> => {
    const { data, error } = await supabase.rpc('create_checkin_with_streak', {
      p_task_id: taskId,
      p_status: status,
      p_date: date ?? undefined,
      p_note: note,
    })

    if (error) throw error

    return successResponse(data as unknown as CheckinResult)
  }
)

/**
 * Update an existing check-in status
 * @param checkinId - Check-in UUID
 * @param status - New status
 * @param note - Optional note
 */
export const updateCheckIn = authAction(
  'updateCheckIn',
  async (
    { supabase, user },
    checkinId: string,
    status: CheckinStatus,
    note?: string
  ): Promise<ApiResponse<void>> => {
    const { error } = await supabase
      .from('check_ins')
      .update({ status, note })
      .eq('id', checkinId)
      .eq('user_id', user.id)

    if (error) throw error

    return successResponse(undefined)
  }
)

export interface UndoCheckinResult {
  taskId: string
  newStreak: number
  bestStreak: number
}

/**
 * Undo a check-in: delete it and recalculate streak
 * best_streak is preserved ("no guilt" philosophy)
 */
export const undoCheckIn = authAction(
  'undoCheckIn',
  async ({ supabase }, checkinId: string): Promise<ApiResponse<UndoCheckinResult>> => {
    const { data, error } = await supabase.rpc('undo_checkin_with_streak', {
      p_checkin_id: checkinId,
    })

    if (error) throw error

    return successResponse(data as unknown as UndoCheckinResult)
  }
)

// ============================================
// Month summary
// ============================================
export interface MonthCheckInRow {
  date: string
  status: CheckinStatus
  task_id: string
}

/**
 * Fetch all check-ins for a date range (used for month heatmap).
 * Returns raw rows -- grouping happens client-side.
 */
export const getMonthCheckIns = authAction(
  'getMonthCheckIns',
  async (
    { supabase, user },
    startDate: string,
    endDate: string
  ): Promise<ApiListResult<MonthCheckInRow>> => {
    const { data, error } = await supabase
      .from('check_ins')
      .select('date, status, task_id')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) throw error

    return listResponse((data ?? []) as MonthCheckInRow[])
  }
)
