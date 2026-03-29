'use client'

import { useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, addDays, startOfWeek } from 'date-fns'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { unwrapResponse } from '@/lib/api'
import { mapApiTasksToEntities } from '@/lib/utils/task-utils'
import { getWeekHomeTasks } from '@/actions/home.actions'
import type { HomeTask } from '@/types/entities'

/**
 * Fetch tasks for all 7 days of the selected week in a single server action call.
 * Uses get_week_tasks RPC (1 DB query) instead of 7 separate POST requests.
 * Also seeds individual day caches so useHomeTasks(date) gets cache hits.
 *
 * @param selectedDate - The date within the target week
 * @param directionId - Optional direction ID for version browsing (bypasses date-based resolution)
 */
export function useWeekTasks(selectedDate: Date, directionId?: string) {
  const queryClient = useQueryClient()
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd')

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekStartStr]
  )

  const { data: rawTasksByDate, isLoading } = useQuery({
    queryKey: queryKeys.tasks.homeWeek(weekStartStr, directionId),
    queryFn: () => getWeekHomeTasks(weekStartStr, weekEndStr, directionId).then(unwrapResponse),
    staleTime: STALE_TIMES.HOME_TASKS,
  })

  // Seed individual day caches so useHomeTasks(date, directionId) gets instant cache hits.
  // Uses raw DTO data (before select transform) which is correct — setQueryData stores raw cache.
  useEffect(() => {
    if (!rawTasksByDate) return
    for (const [dateStr, tasks] of Object.entries(rawTasksByDate)) {
      queryClient.setQueryData(queryKeys.tasks.home(dateStr, directionId), tasks)
    }
  }, [rawTasksByDate, queryClient, directionId])

  // Transform raw DTOs to entities via select-like useMemo.
  // We can't use query `select` here because we need rawTasksByDate for cache seeding above.
  const tasksByDate = useMemo(() => {
    if (!rawTasksByDate) return null
    const result: Record<string, HomeTask[]> = {}
    for (const [dateStr, tasks] of Object.entries(rawTasksByDate)) {
      result[dateStr] = mapApiTasksToEntities(tasks)
    }
    return result
  }, [rawTasksByDate])

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
