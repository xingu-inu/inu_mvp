'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { getTasks as getTasksAction } from '@/actions'
import type { Task } from '@/types/entities'

/**
 * Tasks grouped by date for month view
 */
export type MonthTasksData = Record<string, Task[]>

/**
 * Fetch all active tasks
 */
async function fetchTasks(): Promise<Task[]> {
  const response = await getTasksAction()
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * Check if a task should appear on a given day based on repeat type
 */
function shouldTaskAppearOnDay(task: Task, dayOfWeek: number): boolean {
  switch (task.repeat_type) {
    case 'once':
    case 'daily':
      return true
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6
    case 'weekly':
    case 'custom':
      return task.repeat_days?.includes(dayOfWeek) ?? false
    default:
      return false
  }
}

/**
 * Hook for fetching and grouping tasks by date for month view
 */
export function useMonthTasks(currentDate: Date) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthKey = format(monthStart, 'yyyy-MM')

  const query = useQuery({
    queryKey: [...queryKeys.tasks.all, 'month', monthKey],
    queryFn: fetchTasks,
    staleTime: STALE_TIMES.TASK,
  })

  // Group tasks by date
  const groupedTasks = useMemo<MonthTasksData>(() => {
    const tasks = query.data ?? []
    const grouped: MonthTasksData = {}

    // Generate all days of the month
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    days.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayOfWeek = getDay(day)

      // Filter tasks that should appear on this day
      grouped[dateStr] = tasks.filter(
        (task) => shouldTaskAppearOnDay(task, dayOfWeek) && task.is_active
      )
    })

    return grouped
  }, [query.data, monthStart, monthEnd])

  return {
    ...query,
    data: groupedTasks,
    monthStart,
    monthEnd,
  }
}
