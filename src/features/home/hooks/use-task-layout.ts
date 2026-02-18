import { useMemo } from 'react'
import { HOUR_HEIGHT, TIME_SLOT_CONFIG } from '@/lib/constants/time-slots'
import type { HomeTask, TimeSlot } from '@/types/entities'

export interface PositionedTask {
  task: HomeTask
  topPx: number
  heightPx: number
  leftPercent: number
  widthPercent: number
}

interface DayLayout {
  positioned: PositionedTask[]
  anytime: HomeTask[]
}

const MIN_BLOCK_HEIGHT = 28

/**
 * Parse "HH:MM" string to total minutes from midnight.
 */
function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Compute vertical position for a single task.
 */
function computeVertical(task: HomeTask): { topPx: number; heightPx: number } | null {
  const slot = task.time_slot as TimeSlot

  // anytime tasks are handled separately
  if (slot === 'anytime' || !slot) return null

  const config = TIME_SLOT_CONFIG[slot]
  if (!config) return null

  let topPx: number
  let heightPx: number

  if (task.specific_time) {
    // Precise positioning based on specific_time
    const startMinutes = parseTime(task.specific_time)
    topPx = (startMinutes / 60) * HOUR_HEIGHT

    if (task.duration_minutes > 0) {
      heightPx = (task.duration_minutes / 60) * HOUR_HEIGHT
    } else {
      // Default to 1 hour if no duration
      heightPx = HOUR_HEIGHT
    }
  } else {
    // Position based on time slot range — always span the full slot
    const [startHour, endHour] = config.hours
    topPx = startHour * HOUR_HEIGHT
    heightPx = (endHour - startHour) * HOUR_HEIGHT
  }

  return {
    topPx,
    heightPx: Math.max(heightPx, MIN_BLOCK_HEIGHT),
  }
}

/**
 * Resolve horizontal overlaps using a column-packing algorithm.
 * Tasks that overlap in time get placed side-by-side (Google Calendar style).
 */
function resolveOverlaps(
  tasks: Array<{ task: HomeTask; topPx: number; heightPx: number }>
): PositionedTask[] {
  if (tasks.length === 0) return []

  // Sort by top (ascending), then by height (descending) — longer events first
  const sorted = [...tasks].sort((a, b) => a.topPx - b.topPx || b.heightPx - a.heightPx)

  // Column assignment: each column is an array of tasks
  const columns: Array<Array<(typeof sorted)[0]>> = []

  for (const item of sorted) {
    // Find first column where this task doesn't overlap
    let placed = false
    for (const col of columns) {
      const lastInCol = col[col.length - 1]
      const lastEnd = lastInCol.topPx + lastInCol.heightPx
      if (item.topPx >= lastEnd) {
        col.push(item)
        placed = true
        break
      }
    }

    if (!placed) {
      columns.push([item])
    }
  }

  const totalColumns = columns.length

  // Build positioned tasks with column-based widths
  const result: PositionedTask[] = []
  for (let colIdx = 0; colIdx < columns.length; colIdx++) {
    for (const item of columns[colIdx]) {
      result.push({
        task: item.task,
        topPx: item.topPx,
        heightPx: item.heightPx,
        leftPercent: (colIdx / totalColumns) * 100,
        widthPercent: (1 / totalColumns) * 100,
      })
    }
  }

  return result
}

/**
 * Compute positioned task layout for a single day.
 */
function computeDayLayout(tasks: HomeTask[]): DayLayout {
  const anytime: HomeTask[] = []
  const timed: Array<{ task: HomeTask; topPx: number; heightPx: number }> = []

  for (const task of tasks) {
    if (task.time_slot === 'anytime' || !task.time_slot) {
      anytime.push(task)
      continue
    }

    const vertical = computeVertical(task)
    if (vertical) {
      timed.push({ task, ...vertical })
    }
  }

  return {
    positioned: resolveOverlaps(timed),
    anytime,
  }
}

/**
 * Hook: compute task layout for all days in a week.
 * Returns positioned tasks + anytime tasks per day.
 */
export function useTaskLayout(tasksByDate: Record<string, HomeTask[]>): Record<string, DayLayout> {
  return useMemo(() => {
    const result: Record<string, DayLayout> = {}
    for (const [dateStr, tasks] of Object.entries(tasksByDate)) {
      result[dateStr] = computeDayLayout(tasks)
    }
    return result
  }, [tasksByDate])
}
