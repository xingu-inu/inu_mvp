import type { TimeSlot, RepeatType } from '@/types/entities'
import { TIME_SLOT_CONFIG, TIME_SLOT_ORDER } from '@/lib/constants/time-slots'

/**
 * Format duration in minutes to a compact string.
 * e.g. 30 → "30m", 60 → "1h", 90 → "1.5h", 120 → "2h"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = minutes / 60
  if (Number.isInteger(hours)) return `${hours}h`
  return `${hours.toFixed(1).replace(/\.0$/, '')}h`
}

/**
 * Format repeat type to a compact Korean label for calendar display.
 */
export function formatRepeatType(type: RepeatType): string | null {
  switch (type) {
    case 'daily':
      return '매일'
    case 'weekdays':
      return '평일'
    case 'weekends':
      return '주말'
    case 'weekly':
      return '매주'
    case 'custom':
      return '반복'
    case 'once':
    default:
      return null
  }
}

/**
 * Gets the current time slot based on the hour of the day
 */
export function getTimeSlotForCurrentTime(): TimeSlot {
  const hour = new Date().getHours()

  for (const slot of TIME_SLOT_ORDER) {
    if (slot === 'anytime') continue

    const [start, end] = TIME_SLOT_CONFIG[slot].hours
    if (hour >= start && hour < end) {
      return slot
    }
  }

  return 'anytime'
}

/**
 * Gets greeting message based on time of day
 */
export function getGreeting(): string {
  const hour = new Date().getHours()

  if (hour >= 0 && hour < 6) {
    return '좋은 새벽이에요'
  } else if (hour >= 6 && hour < 12) {
    return '좋은 아침이에요'
  } else if (hour >= 12 && hour < 18) {
    return '좋은 오후예요'
  } else {
    return '좋은 저녁이에요'
  }
}

/**
 * Computes all field updates needed when unlinking a cross-linked task from a goal.
 * Cleans up related_goal_ids, cross_link_group_map, AND related_area_ids.
 */
export function computeUnlinkUpdates(opts: {
  relatedGoalIds: string[]
  relatedAreaIds: string[]
  crossLinkGroupMap: Record<string, string | null>
  unlinkGoalId: string
  unlinkGoalAreaId: string
  allGoals: Array<{ id: string; area_id: string }>
}): {
  related_goal_ids: string[]
  related_area_ids: string[]
  cross_link_group_map: Record<string, string | null>
} {
  const newRelatedGoalIds = opts.relatedGoalIds.filter((id) => id !== opts.unlinkGoalId)

  const newGroupMap = { ...opts.crossLinkGroupMap }
  delete newGroupMap[opts.unlinkGoalId]

  // Remove the area if no remaining related goals belong to it
  const areaStillNeeded = newRelatedGoalIds.some((gId) => {
    const g = opts.allGoals.find((gg) => gg.id === gId)
    return g?.area_id === opts.unlinkGoalAreaId
  })
  const newRelatedAreaIds = areaStillNeeded
    ? opts.relatedAreaIds
    : opts.relatedAreaIds.filter((id) => id !== opts.unlinkGoalAreaId)

  return {
    related_goal_ids: newRelatedGoalIds,
    related_area_ids: newRelatedAreaIds,
    cross_link_group_map: newGroupMap,
  }
}
