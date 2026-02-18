'use server'

import { authAction } from '@/lib/security'

export interface DailyBreakdown {
  date: string
  done: number
  skip: number
}

export interface AreaBreakdown {
  areaId: string
  areaName: string
  done: number
  total: number
}

export interface WeeklyStats {
  totalTasks: number
  completedCount: number
  skippedCount: number
  dailyBreakdown: DailyBreakdown[]
  areaBreakdown: AreaBreakdown[]
}

/**
 * Get weekly statistics for the review screen
 * @param weekStart - Start date of the week (YYYY-MM-DD)
 */
export const getWeeklyStats = authAction(
  'getWeeklyStats',
  async ({ supabase, user }, weekStart: string): Promise<WeeklyStats> => {
    const { data, error } = await supabase.rpc('get_weekly_stats', {
      p_user_id: user.id,
      p_week_start: weekStart,
    })

    if (error) throw error

    return data as unknown as WeeklyStats
  }
)

/**
 * Get the start of the current week (Monday)
 */
export async function getCurrentWeekStart(): Promise<string> {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust when Sunday
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}
