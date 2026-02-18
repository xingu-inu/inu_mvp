'use client'

import { useQuery } from '@tanstack/react-query'
import {
  format,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
} from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { useReviewPeriod } from './use-review-period'
import { useReviewDirection } from './use-review-direction'

export interface AreaTrendPoint {
  periodLabel: string // "이번주", "1주전" or "이번달", "1월"
  completionRate: number
}

export interface AreaTrendData {
  areaId: string
  areaName: string
  areaEmoji: string
  areaColor: string
  points: AreaTrendPoint[]
}

interface PeriodRange {
  start: string
  end: string
  label: string
}

function getPastPeriods(isWeek: boolean, currentStart: string, count: number): PeriodRange[] {
  const periods: PeriodRange[] = []
  const base = parseISO(currentStart)

  for (let i = count - 1; i >= 0; i--) {
    if (isWeek) {
      const weekDate = subWeeks(base, i)
      const start = startOfWeek(weekDate, { weekStartsOn: 1 })
      const end = endOfWeek(weekDate, { weekStartsOn: 1 })
      periods.push({
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
        label: i === 0 ? '이번주' : `${i}주전`,
      })
    } else {
      const monthDate = subMonths(base, i)
      const start = startOfMonth(monthDate)
      const end = endOfMonth(monthDate)
      periods.push({
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
        label: i === 0 ? '이번달' : format(start, 'M월'),
      })
    }
  }

  return periods
}

interface CheckInRow {
  date: string
  status: string
}

interface TaskRow {
  id: string
  is_active: boolean
  check_ins: CheckInRow[]
}

interface GoalRow {
  id: string
  status: string
  tasks: TaskRow[]
}

interface AreaRow {
  id: string
  name: string
  emoji: string
  color: string
  goals: GoalRow[]
}

async function fetchAreaTrends(
  isWeek: boolean,
  currentStart: string,
  directionId: string
): Promise<AreaTrendData[]> {
  const supabase = createClient()
  const periodCount = isWeek ? 6 : 5
  const periods = getPastPeriods(isWeek, currentStart, periodCount)

  const overallStart = periods[0].start
  const overallEnd = periods[periods.length - 1].end

  const { data: areas, error } = await supabase
    .from('areas')
    .select(
      `
      id, name, emoji, color,
      goals (
        id, status,
        tasks (
          id, is_active,
          check_ins (date, status)
        )
      )
    `
    )
    .eq('direction_id', directionId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  if (!areas) return []

  const result: AreaTrendData[] = []

  for (const area of areas as AreaRow[]) {
    const activeTasks: Array<{ id: string; checkIns: CheckInRow[] }> = []

    for (const goal of area.goals ?? []) {
      if (!['active', 'maintenance'].includes(goal.status)) continue
      for (const task of goal.tasks ?? []) {
        if (!task.is_active) continue
        const relevantCheckIns = (task.check_ins ?? []).filter(
          (c) => c.date >= overallStart && c.date <= overallEnd
        )
        activeTasks.push({ id: task.id, checkIns: relevantCheckIns })
      }
    }

    if (activeTasks.length === 0) continue

    const points: AreaTrendPoint[] = periods.map((period) => {
      let done = 0
      let scheduled = 0

      for (const task of activeTasks) {
        const periodCheckIns = task.checkIns.filter(
          (c) => c.date >= period.start && c.date <= period.end
        )
        scheduled += periodCheckIns.length
        done += periodCheckIns.filter((c) => c.status === 'done').length
      }

      return {
        periodLabel: period.label,
        completionRate: scheduled > 0 ? Math.round((done / scheduled) * 100) : 0,
      }
    })

    result.push({
      areaId: area.id,
      areaName: area.name,
      areaEmoji: area.emoji,
      areaColor: area.color,
      points,
    })
  }

  return result
}

export function useAreaTrend() {
  const { startDate, isWeek } = useReviewPeriod()
  const { directionId } = useReviewDirection()

  // Derive the overall range for the cache key
  const periodCount = isWeek ? 6 : 5
  const periods = directionId ? getPastPeriods(isWeek, startDate, periodCount) : []
  const overallStart = periods[0]?.start ?? startDate
  const overallEnd = periods[periods.length - 1]?.end ?? startDate

  return useQuery<AreaTrendData[]>({
    queryKey: [...queryKeys.review.areaStats(overallStart, overallEnd), 'trend', directionId],
    queryFn: () => fetchAreaTrends(isWeek, startDate, directionId!),
    staleTime: STALE_TIMES.STATS,
    enabled: !!directionId,
  })
}
