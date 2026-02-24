'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { unwrapListResponse } from '@/lib/api'
import { getMonthCheckIns } from '@/actions/checkin.actions'
import { useMonthTasks } from './use-month-tasks'
import { useAreas } from '@/queries/use-areas'

/** Per-area completion info for a single day. */
export interface AreaDayInfo {
  color: string
  total: number
  done: number
}

/** Lightweight task preview for month calendar cells. */
export interface MonthTaskPreview {
  id: string
  name: string
  areaColor: string | null
  isDone: boolean
  isSkip: boolean
  repeatType: string | null
  durationMinutes: number
}

/** Per-day summary for the month heatmap. */
export interface MonthDaySummary {
  total: number
  done: number
  skip: number
  areas: AreaDayInfo[]
}

export type MonthSummaryData = Record<string, MonthDaySummary>
export type MonthTaskPreviewData = Record<string, MonthTaskPreview[]>

/**
 * Combines task schedule data with check-in completion data
 * to provide per-day summaries for the month heatmap calendar.
 */
export function useMonthSummary(currentDate: Date) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startStr = format(monthStart, 'yyyy-MM-dd')
  const endStr = format(monthEnd, 'yyyy-MM-dd')
  const monthKey = format(monthStart, 'yyyy-MM')

  // Task schedule data (which tasks appear on which day)
  const { data: tasksByDate, isLoading: tasksLoading } = useMonthTasks(currentDate)

  // Check-in rows for the month
  const { data: checkInRows, isLoading: checkInsLoading } = useQuery({
    queryKey: [...queryKeys.checkIns.all, 'month-summary', monthKey],
    queryFn: () => getMonthCheckIns(startStr, endStr).then(unwrapListResponse),
    staleTime: STALE_TIMES.CHECKIN,
  })

  // Areas for color lookup (area_id → color)
  const { data: areas, isLoading: areasLoading } = useAreas()

  // Shared area_id → color map (used by both summary and taskPreviews)
  const areaColorMap = useMemo<Record<string, string>>(() => {
    if (!areas) return {}
    const map: Record<string, string> = {}
    for (const area of areas) {
      map[area.id] = area.color
    }
    return map
  }, [areas])

  // Merge: task counts + check-in status per day + per-area breakdown
  const summary = useMemo<MonthSummaryData>(() => {
    if (!tasksByDate) return {}

    // Index check-ins: date totals + per-date done task_ids
    const checkInsByDate: Record<string, { done: number; skip: number }> = {}
    const doneTasksByDate: Record<string, Set<string>> = {}
    if (checkInRows) {
      for (const row of checkInRows) {
        if (!checkInsByDate[row.date]) {
          checkInsByDate[row.date] = { done: 0, skip: 0 }
        }
        if (row.status === 'done') {
          checkInsByDate[row.date].done++
          if (!doneTasksByDate[row.date]) doneTasksByDate[row.date] = new Set()
          doneTasksByDate[row.date].add(row.task_id)
        } else if (row.status === 'skip') {
          checkInsByDate[row.date].skip++
        }
      }
    }

    const result: MonthSummaryData = {}

    for (const [dateKey, tasks] of Object.entries(tasksByDate)) {
      if (tasks.length === 0) continue

      // Group tasks by area and count done per area
      const areaStats: Record<string, AreaDayInfo> = {}
      for (const task of tasks) {
        const areaId = (task.goal as { area_id?: string } | undefined)?.area_id
        if (!areaId) continue
        const color = areaColorMap[areaId]
        if (!color) continue

        if (!areaStats[areaId]) {
          areaStats[areaId] = { color, total: 0, done: 0 }
        }
        areaStats[areaId].total++

        if (doneTasksByDate[dateKey]?.has(task.id)) {
          areaStats[areaId].done++
        }
      }

      const ci = checkInsByDate[dateKey]

      result[dateKey] = {
        total: tasks.length,
        done: ci?.done ?? 0,
        skip: ci?.skip ?? 0,
        areas: Object.values(areaStats)
          .sort((a, b) => b.total - a.total)
          .slice(0, 4),
      }
    }

    return result
  }, [tasksByDate, checkInRows, areaColorMap])

  // Build lightweight task previews per day for calendar cell rendering
  const taskPreviews = useMemo<MonthTaskPreviewData>(() => {
    if (!tasksByDate) return {}

    // Index check-in status per task per date
    const checkinStatusByDate: Record<string, Record<string, string>> = {}
    if (checkInRows) {
      for (const row of checkInRows) {
        if (!checkinStatusByDate[row.date]) checkinStatusByDate[row.date] = {}
        checkinStatusByDate[row.date][row.task_id] = row.status
      }
    }

    const result: MonthTaskPreviewData = {}
    for (const [dateKey, tasks] of Object.entries(tasksByDate)) {
      if (tasks.length === 0) continue
      result[dateKey] = tasks.map((task) => {
        const areaId = (task.goal as { area_id?: string } | undefined)?.area_id
        const status = checkinStatusByDate[dateKey]?.[task.id]
        return {
          id: task.id,
          name: task.name,
          areaColor: areaId ? (areaColorMap[areaId] ?? null) : null,
          isDone: status === 'done',
          isSkip: status === 'skip',
          repeatType: (task as { repeat_type?: string }).repeat_type ?? null,
          durationMinutes: (task as { duration_minutes?: number }).duration_minutes ?? 0,
        }
      })
    }
    return result
  }, [tasksByDate, checkInRows, areaColorMap])

  return {
    summary,
    taskPreviews,
    isLoading: tasksLoading || checkInsLoading || areasLoading,
  }
}
