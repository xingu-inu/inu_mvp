'use client'

import { useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, addDays, startOfWeek } from 'date-fns'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { unwrapResponse } from '@/lib/api'
import { getWeekHomeTasks } from '@/actions/home.actions'
import type { HomeTask } from '@/actions/home.actions'

/**
 * Fetch tasks for all 7 days of the selected week in a single server action call.
 * Uses get_week_tasks RPC (1 DB query) instead of 7 separate POST requests.
 * Also seeds individual day caches so useHomeTasks(date) gets cache hits.
 */
export function useWeekTasks(selectedDate: Date) {
  const queryClient = useQueryClient()
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd')

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekStartStr]
  )

  const { data: tasksByDate, isLoading } = useQuery({
    queryKey: queryKeys.tasks.homeWeek(weekStartStr),
    queryFn: () => getWeekHomeTasks(weekStartStr, weekEndStr).then(unwrapResponse),
    staleTime: STALE_TIMES.HOME_TASKS,
  })

  // Seed individual day caches so useHomeTasks(date) gets instant cache hits
  useEffect(() => {
    if (!tasksByDate) return
    for (const [dateStr, tasks] of Object.entries(tasksByDate)) {
      queryClient.setQueryData(queryKeys.tasks.home(dateStr), tasks)
    }
  }, [tasksByDate, queryClient])

  const safeTasksByDate = useMemo(() => {
    if (!tasksByDate) {
      const empty: Record<string, HomeTask[]> = {}
      for (const day of weekDays) {
        empty[format(day, 'yyyy-MM-dd')] = []
      }
      return empty
    }
    return tasksByDate
  }, [tasksByDate, weekDays])

  return { tasksByDate: safeTasksByDate, weekDays, isLoading }
}
