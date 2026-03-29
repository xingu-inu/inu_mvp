'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { addDays, addMonths, format, parseISO } from 'date-fns'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { fetchCheckInHistory } from './use-checkin-history'
import { fetchMoodHistory } from './use-mood-history'
import { useReviewPeriod } from './use-review-period'
import { useReviewDirection } from './use-review-direction'
import { MOOD_VALUES } from '../utils/review-utils'
import type { MoodLevel } from '@/types/entities'

export interface ComparisonData {
  prevCompletionRate: number
  currentCompletionRate: number
  completionDelta: number
  prevActiveDays: number
  currentActiveDays: number
  activeDaysDelta: number
  prevAvgMood: number | null
  currentAvgMood: number | null
  moodDelta: number | null
  hasPrevData: boolean
}

export function useComparisonData(
  currentCompletionRate: number,
  currentActiveDays: number,
  currentMoodHistory: Array<{ mood: MoodLevel }> | undefined
) {
  const { startDate, isWeek } = useReviewPeriod()
  const { directionId } = useReviewDirection()

  // Compute previous period dates
  const { prevStart, prevEnd } = useMemo(() => {
    const start = parseISO(startDate)
    if (isWeek) {
      const prevEnd = addDays(start, -1)
      const prevStart = addDays(prevEnd, -6)
      return {
        prevStart: format(prevStart, 'yyyy-MM-dd'),
        prevEnd: format(prevEnd, 'yyyy-MM-dd'),
      }
    } else {
      const prevMonthStart = addMonths(start, -1)
      const prevMonthEnd = addDays(start, -1)
      return {
        prevStart: format(prevMonthStart, 'yyyy-MM-dd'),
        prevEnd: format(prevMonthEnd, 'yyyy-MM-dd'),
      }
    }
  }, [startDate, isWeek])

  // Fetch previous period check-in history
  const { data: prevCheckIns } = useQuery({
    queryKey: queryKeys.review.history(prevStart, prevEnd, directionId ?? undefined),
    queryFn: () => fetchCheckInHistory(prevStart, prevEnd, directionId ?? undefined),
    staleTime: STALE_TIMES.REVIEW_HISTORICAL,
    enabled: !!directionId,
  })

  // Fetch previous period mood history
  const { data: prevMoods } = useQuery({
    queryKey: queryKeys.review.moods(prevStart, prevEnd),
    queryFn: () => fetchMoodHistory(prevStart, prevEnd),
    staleTime: STALE_TIMES.REVIEW_HISTORICAL,
    enabled: !!directionId,
  })

  return useMemo((): ComparisonData => {
    // Previous period stats
    const prevDays = prevCheckIns ?? []
    const prevTotalDone = prevDays.reduce((s, d) => s + d.completed, 0)
    const prevTotalScheduled = prevDays.reduce((s, d) => s + d.total, 0)
    const prevCompletionRate =
      prevTotalScheduled > 0 ? Math.round((prevTotalDone / prevTotalScheduled) * 100) : 0
    const prevActiveDays = prevDays.filter((d) => d.completed > 0).length

    // Previous mood average
    let prevAvgMood: number | null = null
    if (prevMoods?.length) {
      prevAvgMood = prevMoods.reduce((s, m) => s + MOOD_VALUES[m.mood], 0) / prevMoods.length
    }

    // Current mood average
    let currentAvgMood: number | null = null
    if (currentMoodHistory?.length) {
      currentAvgMood =
        currentMoodHistory.reduce((s, m) => s + MOOD_VALUES[m.mood], 0) / currentMoodHistory.length
    }

    const hasPrevData = prevDays.length > 0

    return {
      prevCompletionRate,
      currentCompletionRate,
      completionDelta: currentCompletionRate - prevCompletionRate,
      prevActiveDays,
      currentActiveDays,
      activeDaysDelta: currentActiveDays - prevActiveDays,
      prevAvgMood,
      currentAvgMood,
      moodDelta:
        prevAvgMood != null && currentAvgMood != null ? currentAvgMood - prevAvgMood : null,
      hasPrevData,
    }
  }, [prevCheckIns, prevMoods, currentCompletionRate, currentActiveDays, currentMoodHistory])
}
