import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, startOfWeek } from 'date-fns'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { unwrapListResponse, unwrapResponse } from '@/lib/api'
import { mapApiTasksToEntities } from '@/lib/utils/task-utils'
import {
  getHomeTasks as getHomeTasksAction,
  getWeekHomeTasks,
  type HomeTaskDto,
} from '@/actions/home.actions'

/**
 * Home tasks query hook with date selection.
 * Uses `select` to transform raw DTOs into HomeTask entities at the query level.
 * TQ's structural sharing ensures the select result reference is stable when data hasn't changed.
 *
 * @param date - The date to fetch tasks for
 * @param directionId - Optional direction ID for version browsing
 */
export function useHomeTasks(date: Date = new Date(), directionId?: string) {
  const dateStr = format(date, 'yyyy-MM-dd')
  const queryClient = useQueryClient()
  const weekStartStr = format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd')

  return useQuery({
    queryKey: queryKeys.tasks.home(dateStr, directionId),
    queryFn: () => getHomeTasksAction(dateStr, directionId).then(unwrapListResponse),
    staleTime: STALE_TIMES.HOME_TASKS,
    select: mapApiTasksToEntities,
    // Derive from week cache to avoid redundant fetch before useWeekTasks seeds day caches
    placeholderData: () => {
      const weekData = queryClient.getQueryData<Record<string, HomeTaskDto[]>>(
        queryKeys.tasks.homeWeek(weekStartStr, directionId)
      )
      return weekData?.[dateStr]
    },
  })
}

/**
 * Prefetch adjacent weeks for smoother week navigation.
 * Uses batch week fetch (1 POST per week) instead of individual day fetches.
 */
export function usePrefetchHomeTasks(selectedDate: Date, directionId?: string) {
  const queryClient = useQueryClient()
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })

  // Derive stable string keys for prev/next weeks
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const prevStartStr = format(prevWeekStart, 'yyyy-MM-dd')
  const prevEndStr = format(new Date(prevWeekStart.getTime() + 6 * 86400000), 'yyyy-MM-dd')

  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  const nextStartStr = format(nextWeekStart, 'yyyy-MM-dd')
  const nextEndStr = format(new Date(nextWeekStart.getTime() + 6 * 86400000), 'yyyy-MM-dd')

  useEffect(() => {
    const prefetchWeek = (startStr: string, endStr: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.tasks.homeWeek(startStr, directionId),
        queryFn: () => getWeekHomeTasks(startStr, endStr, directionId).then(unwrapResponse),
        staleTime: STALE_TIMES.HOME_TASKS,
      })
    }

    // Defer prefetch to idle time so it doesn't compete with critical renders
    const run = () => {
      prefetchWeek(prevStartStr, prevEndStr)
      prefetchWeek(nextStartStr, nextEndStr)
    }

    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(run, { timeout: 3000 })
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(run, 1000)
    return () => clearTimeout(id)
  }, [queryClient, prevStartStr, prevEndStr, nextStartStr, nextEndStr, directionId])
}

export type { HomeTaskDto }
