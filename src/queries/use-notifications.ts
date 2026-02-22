'use client'

import { useQuery } from '@tanstack/react-query'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  computeNotifications,
  countActionableNotifications,
  type WeeklyStats,
  type GoalWeeklyStats,
} from '@/lib/notifications'
import { unwrapListResponse } from '@/lib/api'
import { mapApiTasksToEntities } from '@/lib/utils/task-utils'
import { getHomeTasks, getWeekHomeTasks } from '@/actions/home.actions'
import { getGoals } from '@/actions/goal.actions'
import type { AppNotification } from '@/types/entities'

async function fetchNotifications(): Promise<AppNotification[]> {
  const today = new Date()
  const dateStr = format(today, 'yyyy-MM-dd')
  const isMonday = today.getDay() === 1

  // Core data (always needed)
  const [tasksResponse, goalsResponse] = await Promise.all([getHomeTasks(dateStr), getGoals()])

  const apiTasks = unwrapListResponse(tasksResponse)
  const todayTasks = mapApiTasksToEntities(apiTasks)

  const activeGoals = goalsResponse.success
    ? goalsResponse.data.filter((g) => g.status === 'active')
    : []

  // Weekly data (conditional)
  let lastWeekStats: WeeklyStats | undefined
  let goalStats: GoalWeeklyStats[] | undefined

  // Fetch last week stats on Mondays
  if (isMonday) {
    const lastWeek = subWeeks(today, 1)
    const weekStart = format(startOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd = format(endOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')

    const weekResponse = await getWeekHomeTasks(weekStart, weekEnd)
    if (weekResponse.success && weekResponse.data) {
      const allWeekTasks = Object.values(weekResponse.data).flat()
      const totalDone = allWeekTasks.filter((t) => t.todayCheckIn?.status === 'done').length
      const totalScheduled = allWeekTasks.length
      lastWeekStats = { totalDone, totalScheduled }
    }
  }

  // Compute this week's goal stats
  try {
    const thisWeekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekResponse = await getWeekHomeTasks(thisWeekStart, dateStr)
    if (weekResponse.success && weekResponse.data) {
      const allWeekTasks = Object.values(weekResponse.data).flat()
      const goalMap = new Map<string, { goalName: string; done: number; total: number }>()

      for (const task of allWeekTasks) {
        const goal = task.goal
        if (!goal) continue
        const goalId = goal.id
        const existing = goalMap.get(goalId) ?? { goalName: goal.name, done: 0, total: 0 }
        existing.total++
        if (task.todayCheckIn?.status === 'done') existing.done++
        goalMap.set(goalId, existing)
      }

      goalStats = Array.from(goalMap.entries())
        .filter(([, stats]) => stats.total > 0)
        .map(([goalId, stats]) => ({
          goalId,
          goalName: stats.goalName,
          done: stats.done,
          total: stats.total,
        }))
    }
  } catch {
    // Silently fail — goal progress is optional
  }

  return computeNotifications(todayTasks, activeGoals, today, {
    lastWeekStats,
    goalStats,
  })
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.today(),
    queryFn: fetchNotifications,
    staleTime: STALE_TIMES.NOTIFICATIONS,
  })
}

export function useNotificationCount() {
  const { data: notifications = [] } = useNotifications()
  return countActionableNotifications(notifications)
}
