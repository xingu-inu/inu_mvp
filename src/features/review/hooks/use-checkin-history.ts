'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { createClient } from '@/lib/supabase/client'
import { useReviewPeriod } from './use-review-period'
import { useReviewDirection } from './use-review-direction'

export interface DayHistory {
  date: string
  completed: number
  total: number
}

export async function fetchCheckInHistory(
  start: string,
  end: string,
  directionId?: string
): Promise<DayHistory[]> {
  const supabase = createClient()

  let taskIds: string[] | undefined

  // Step 1: Get task IDs belonging to this direction
  if (directionId) {
    const { data: areas } = await supabase
      .from('areas')
      .select('goals(tasks(id))')
      .eq('direction_id', directionId)

    if (areas) {
      taskIds = areas.flatMap((a: Record<string, unknown>) =>
        ((a.goals as Array<Record<string, unknown>>) ?? []).flatMap((g: Record<string, unknown>) =>
          ((g.tasks as Array<Record<string, unknown>>) ?? []).map(
            (t: Record<string, unknown>) => t.id as string
          )
        )
      )
    }
  }

  // Step 2: Fetch check_ins, filtered by task IDs if available
  let query = supabase.from('check_ins').select('date, status').gte('date', start).lte('date', end)

  if (taskIds && taskIds.length > 0) {
    query = query.in('task_id', taskIds)
  } else if (taskIds && taskIds.length === 0) {
    // No tasks for this direction = no check-ins
    return []
  }

  const { data, error } = await query
  if (error) throw error

  // Group by date
  const historyMap = new Map<string, { completed: number; total: number }>()

  data?.forEach((checkIn) => {
    const existing = historyMap.get(checkIn.date) || { completed: 0, total: 0 }
    existing.total++
    if (checkIn.status === 'done') {
      existing.completed++
    }
    historyMap.set(checkIn.date, existing)
  })

  // Convert to array
  const result: DayHistory[] = []
  historyMap.forEach((value, date) => {
    result.push({ date, ...value })
  })

  return result.sort((a, b) => a.date.localeCompare(b.date))
}

export function useCheckInHistory() {
  const { startDate, endDate } = useReviewPeriod()
  const { directionId } = useReviewDirection()

  return useQuery({
    queryKey: queryKeys.review.history(startDate, endDate, directionId),
    queryFn: () => fetchCheckInHistory(startDate, endDate, directionId),
    staleTime: STALE_TIMES.STATS,
    enabled: !!directionId,
  })
}
