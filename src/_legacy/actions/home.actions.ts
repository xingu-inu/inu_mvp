'use server'

import { authAction } from '@/lib/security'
import { listResponse, successResponse } from '@/lib/api'

import type { Enums } from '@/types/database'

type CheckinStatus = Enums<'checkin_status'>
type TimeSlot = Enums<'time_slot'>
import type { ApiListResult, ApiResponse } from '@/types/api'

// Types for RPC return values
export interface HomeTaskDto {
  id: string
  name: string
  why: string | null
  goalId: string | null
  groupId: string | null
  areaId: string | null
  timeSlot: TimeSlot
  specificTime: string | null
  durationMinutes: number
  streakCount: number
  bestStreak: number
  sortOrder: string
  totalCompleted: number
  repeatType: string | null
  repeatDays: number[] | null
  scheduledDate: string | null
  startDate: string | null
  endDate: string | null
  taskStatus: string
  directionVersion: number | null
  goal: {
    id: string
    name: string
    why: string | null
    areaId: string
    area: {
      id: string
      name: string
      emoji: string
      color: string
      why: string | null
      sortOrder: string
    }
  } | null
  group: {
    id: string
    name: string
    why: string | null
  } | null
  directArea: {
    id: string
    name: string
    emoji: string
    color: string
    why: string | null
    sortOrder: string
  } | null
  relatedAreaIds: string[] | null
  relatedAreas: Array<{ id: string; name: string; emoji: string; color: string }> | null
  relatedGoalIds: string[] | null
  relatedGoals: Array<{
    id: string
    name: string
    areaId: string
    area: { id: string; name: string; emoji: string; color: string }
  }> | null
  todayCheckIn: {
    id: string
    status: CheckinStatus
    note: string | null
    createdAt: string
  } | null
}

/**
 * Get home tasks with full details for a single date
 * @param date - Date string (YYYY-MM-DD), defaults to today
 */
export const getHomeTasks = authAction(
  'getHomeTasks',
  async (
    { supabase },
    date?: string,
    directionId?: string
  ): Promise<ApiListResult<HomeTaskDto>> => {
    const { data, error } = await supabase.rpc('get_today_tasks', {
      p_date: date,
      p_direction_id: directionId,
    })

    if (error) throw error

    return listResponse((data as unknown as HomeTaskDto[]) || [])
  }
)

/**
 * Get home tasks for a date range in a single DB call.
 * Uses get_week_tasks RPC (1 query) instead of N separate get_today_tasks calls.
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 */
export const getWeekHomeTasks = authAction(
  'getWeekHomeTasks',
  async (
    { supabase },
    startDate: string,
    endDate: string,
    directionId?: string
  ): Promise<ApiResponse<Record<string, HomeTaskDto[]>>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_week_tasks', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_direction_id: directionId ?? null,
    })

    if (error) throw error

    return successResponse((data as unknown as Record<string, HomeTaskDto[]>) || {})
  }
)

/**
 * Upsert a date-specific sort order for a task.
 * Used by Home DnD — reordering on one date does NOT affect other dates.
 */
export const upsertTaskDateSortOrder = authAction(
  'upsertTaskDateSortOrder',
  async (
    { supabase },
    taskId: string,
    date: string,
    sortOrder: string
  ): Promise<ApiResponse<void>> => {
    const { error } = await supabase.rpc('upsert_task_date_sort_order', {
      p_task_id: taskId,
      p_date: date,
      p_sort_order: sortOrder,
    })

    if (error) throw error

    return successResponse(undefined)
  }
)

/**
 * Move a task to a different section (area/daily).
 * Updates goal_id + clears group_id/area_id + sets sort_order.
 * Also upserts date-specific sort order so the move only affects the given date.
 */
export const moveTaskToSection = authAction(
  'moveTaskToSection',
  async (
    { supabase },
    taskId: string,
    newGoalId: string | null,
    newSortOrder: string,
    date: string
  ): Promise<ApiResponse<void>> => {
    const { error: taskError } = await supabase
      .from('tasks')
      .update({
        goal_id: newGoalId,
        group_id: null,
        area_id: null,
        sort_order: newSortOrder,
      })
      .eq('id', taskId)

    if (taskError) throw taskError

    const { error: sortError } = await supabase.rpc('upsert_task_date_sort_order', {
      p_task_id: taskId,
      p_date: date,
      p_sort_order: newSortOrder,
    })

    if (sortError) throw sortError

    return successResponse(undefined)
  }
)
