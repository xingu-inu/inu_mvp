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
    { supabase, user },
    date?: string,
    directionId?: string
  ): Promise<ApiListResult<HomeTaskDto>> => {
    const { data, error } = await supabase.rpc('get_today_tasks', {
      p_user_id: user.id,
      p_date: date,
      p_direction_id: directionId ?? null,
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
    { supabase, user },
    startDate: string,
    endDate: string,
    directionId?: string
  ): Promise<ApiResponse<Record<string, HomeTaskDto[]>>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_week_tasks', {
      p_user_id: user.id,
      p_start_date: startDate,
      p_end_date: endDate,
      p_direction_id: directionId ?? null,
    })

    if (error) throw error

    return successResponse((data as unknown as Record<string, HomeTaskDto[]>) || {})
  }
)
