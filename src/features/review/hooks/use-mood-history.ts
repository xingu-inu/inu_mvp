'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { createClient } from '@/lib/supabase/client'
import { useReviewPeriod } from './use-review-period'
import type { MoodLevel } from '@/types/entities'

export interface MoodEntry {
  date: string
  mood: MoodLevel
}

export async function fetchMoodHistory(start: string, end: string): Promise<MoodEntry[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('daily_reflections')
    .select('date, mood')
    .gte('date', start)
    .lte('date', end)
    .not('mood', 'is', null)
    .order('date', { ascending: true })

  if (error) throw error

  return (data || []).map((d) => ({
    date: d.date,
    mood: d.mood as MoodLevel,
  }))
}

export function useMoodHistory() {
  const { startDate, endDate } = useReviewPeriod()

  return useQuery({
    queryKey: queryKeys.review.moods(startDate, endDate),
    queryFn: () => fetchMoodHistory(startDate, endDate),
    staleTime: STALE_TIMES.REVIEW,
  })
}
