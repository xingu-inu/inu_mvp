import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, startOfWeek } from 'date-fns'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { unwrapListResponse, unwrapResponse } from '@/lib/api'
import {
  getHomeTasks as getHomeTasksAction,
  getWeekHomeTasks,
  type HomeTask,
} from '@/actions/home.actions'

/**
 * Home tasks query hook with date selection
 * @param date - The date to fetch tasks for
 */
export function useHomeTasks(date: Date = new Date()) {
  const dateStr = format(date, 'yyyy-MM-dd')

  return useQuery({
    queryKey: queryKeys.tasks.home(dateStr),
    queryFn: () => getHomeTasksAction(dateStr).then(unwrapListResponse),
    staleTime: STALE_TIMES.HOME_TASKS,
  })
}

/**
 * Prefetch adjacent weeks for smoother week navigation.
 * Uses batch week fetch (1 POST per week) instead of individual day fetches.
 */
export function usePrefetchHomeTasks(selectedDate: Date) {
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
        queryKey: queryKeys.tasks.homeWeek(startStr),
        queryFn: () => getWeekHomeTasks(startStr, endStr).then(unwrapResponse),
        staleTime: STALE_TIMES.HOME_TASKS,
      })
    }

    // Prefetch previous and next week batches (2 POSTs max)
    prefetchWeek(prevStartStr, prevEndStr)
    prefetchWeek(nextStartStr, nextEndStr)
  }, [queryClient, prevStartStr, prevEndStr, nextStartStr, nextEndStr])
}

export type { HomeTask }
