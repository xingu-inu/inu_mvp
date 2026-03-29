'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { getObstacleAnalysis } from '@/actions/status-history.actions'
import type { AreaReviewData } from './use-review-roadmap-data'
import type { TimeSlot } from '@/types/entities'

// ============================================
// Types
// ============================================

export interface TimeSlotAnalysis {
  timeSlot: string
  label: string
  totalCheckIns: number
  doneCount: number
  skipCount: number
  missCount: number
  completionRate: number
}

export interface SkipMissRatio {
  totalSkip: number
  totalMiss: number
  totalDone: number
  skipRate: number
  missRate: number
}

export interface ObstacleAnalysis {
  reasonCounts: Array<{ reason: string; count: number; entity_type: 'goal' | 'task' }>
  timeSlotAnalysis: TimeSlotAnalysis[]
  skipMiss: SkipMissRatio
  topObstacle: string | null
}

// ============================================
// Constants
// ============================================

const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  dawn: '새벽 (0-6시)',
  morning: '오전 (6-12시)',
  afternoon: '오후 (12-18시)',
  evening: '저녁 (18-24시)',
  anytime: '종일',
}

const TIME_SLOT_ORDER: TimeSlot[] = ['dawn', 'morning', 'afternoon', 'evening', 'anytime']

// ============================================
// Hook
// ============================================

export function useObstacleAnalysis(
  roadmapData: AreaReviewData[] | undefined,
  startDate: string,
  endDate: string
): { data: ObstacleAnalysis | null; isLoading: boolean } {
  // Server action query for reason counts
  const { data: serverData, isLoading } = useQuery({
    queryKey: queryKeys.review.obstacleAnalysis(startDate, endDate),
    queryFn: async () => {
      const result = await getObstacleAnalysis(startDate, endDate)
      if (!result.success || !result.data) return null
      return result.data
    },
    staleTime: STALE_TIMES.REVIEW,
    enabled: !!startDate && !!endDate,
  })

  // Derive time slot + skip/miss from roadmapData
  const derived = useMemo(() => {
    if (!roadmapData) return null

    // Collect all tasks with their check-ins
    const allTasks = roadmapData.flatMap((area) =>
      area.goals.flatMap((goal) =>
        goal.tasks
          .filter((t) => !t.isCrossLinked)
          .map((t) => ({
            timeSlot: t.timeSlot ?? 'anytime',
            recentCheckIns: t.recentCheckIns,
          }))
      )
    )

    // Time slot aggregation
    const slotMap = new Map<TimeSlot, { done: number; skip: number; miss: number; total: number }>()

    for (const { timeSlot, recentCheckIns } of allTasks) {
      const slot = (timeSlot as TimeSlot) ?? 'anytime'
      const existing = slotMap.get(slot) ?? { done: 0, skip: 0, miss: 0, total: 0 }

      for (const ci of recentCheckIns) {
        existing.total++
        if (ci.status === 'done') existing.done++
        else if (ci.status === 'skip') existing.skip++
        else if (ci.status === 'miss') existing.miss++
      }

      slotMap.set(slot, existing)
    }

    const timeSlotAnalysis: TimeSlotAnalysis[] = TIME_SLOT_ORDER.filter((slot) =>
      slotMap.has(slot)
    ).map((slot) => {
      const counts = slotMap.get(slot) ?? { done: 0, skip: 0, miss: 0, total: 0 }
      return {
        timeSlot: slot,
        label: TIME_SLOT_LABELS[slot],
        totalCheckIns: counts.total,
        doneCount: counts.done,
        skipCount: counts.skip,
        missCount: counts.miss,
        completionRate: counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0,
      }
    })

    // Skip/miss aggregation from all check-ins
    let totalDone = 0
    let totalSkip = 0
    let totalMiss = 0

    for (const { recentCheckIns } of allTasks) {
      for (const ci of recentCheckIns) {
        if (ci.status === 'done') totalDone++
        else if (ci.status === 'skip') totalSkip++
        else if (ci.status === 'miss') totalMiss++
      }
    }

    const totalNonDone = totalSkip + totalMiss
    const skipMiss: SkipMissRatio = {
      totalSkip,
      totalMiss,
      totalDone,
      skipRate: totalNonDone > 0 ? Math.round((totalSkip / totalNonDone) * 100) : 0,
      missRate: totalNonDone > 0 ? Math.round((totalMiss / totalNonDone) * 100) : 0,
    }

    return { timeSlotAnalysis, skipMiss }
  }, [roadmapData])

  const data = useMemo((): ObstacleAnalysis | null => {
    if (!derived) return null

    const reasonCounts = serverData?.reasonCounts ?? []
    const topObstacle =
      reasonCounts.length > 0
        ? reasonCounts.reduce(
            (best, curr) => (curr.count > best.count ? curr : best),
            reasonCounts[0]
          ).reason
        : null

    return {
      reasonCounts,
      timeSlotAnalysis: derived.timeSlotAnalysis,
      skipMiss: derived.skipMiss,
      topObstacle,
    }
  }, [derived, serverData])

  return { data, isLoading }
}
