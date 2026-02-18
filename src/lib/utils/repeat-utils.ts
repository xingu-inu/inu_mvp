import type { RepeatType } from '@/types/entities'

/** Display order: Sunday first (일~토) */
const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6] as const
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

export { DAY_ORDER, DAY_LABELS }

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAY_DAYS = [1, 2, 3, 4, 5]
const WEEKEND_DAYS = [0, 6]

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sa = new Set(a)
  return b.every((d) => sa.has(d))
}

/**
 * Convert repeat_type + repeat_days from DB to a UI-friendly day array.
 * Used when loading an existing task for editing.
 */
export function repeatConfigToDays(repeatType: RepeatType, repeatDays: number[] | null): number[] {
  switch (repeatType) {
    case 'daily':
      return [...ALL_DAYS]
    case 'weekdays':
      return [...WEEKDAY_DAYS]
    case 'weekends':
      return [...WEEKEND_DAYS]
    case 'weekly':
    case 'custom':
      return repeatDays && repeatDays.length > 0 ? [...repeatDays] : []
    case 'once':
    default:
      return []
  }
}

/**
 * Convert a day array back to canonical repeat_type + repeat_days for saving.
 * Normalizes to named presets when possible (for backward compatibility with RPCs).
 */
export function daysToRepeatConfig(days: number[]): {
  repeat_type: RepeatType
  repeat_days: number[] | null
} {
  if (days.length === 0) {
    return { repeat_type: 'once', repeat_days: null }
  }
  if (sameSet(days, ALL_DAYS)) {
    return { repeat_type: 'daily', repeat_days: null }
  }
  if (sameSet(days, WEEKDAY_DAYS)) {
    return { repeat_type: 'weekdays', repeat_days: null }
  }
  if (sameSet(days, WEEKEND_DAYS)) {
    return { repeat_type: 'weekends', repeat_days: null }
  }
  return { repeat_type: 'custom', repeat_days: [...days].sort((a, b) => a - b) }
}

/**
 * Detect which preset chip should be highlighted for a given day array.
 * Returns null if no preset matches (custom selection).
 */
export function detectPreset(days: number[]): 'daily' | 'weekdays' | 'weekends' | null {
  if (sameSet(days, ALL_DAYS)) return 'daily'
  if (sameSet(days, WEEKDAY_DAYS)) return 'weekdays'
  if (sameSet(days, WEEKEND_DAYS)) return 'weekends'
  return null
}

/** Days corresponding to each preset chip */
export const PRESET_DAYS: Record<string, number[]> = {
  daily: ALL_DAYS,
  weekdays: WEEKDAY_DAYS,
  weekends: WEEKEND_DAYS,
}

/**
 * Generate a short summary of selected days (e.g., "월, 수, 금").
 * Returns null for preset matches (매일/평일/주말) since the chip label is enough.
 */
export function getRepeatSummary(days: number[]): string | null {
  if (days.length === 0) return null
  if (detectPreset(days) !== null) return null

  return DAY_ORDER.filter((d) => days.includes(d))
    .map((d) => DAY_LABELS[d])
    .join(', ')
}

/**
 * Get a human-readable label for any repeat config.
 * Used in task list display, brain-dump review, etc.
 */
export function getRepeatLabel(repeatType: RepeatType, repeatDays: number[] | null): string {
  switch (repeatType) {
    case 'once':
      return '1회'
    case 'daily':
      return '매일'
    case 'weekdays':
      return '평일'
    case 'weekends':
      return '주말'
    case 'weekly':
    case 'custom': {
      const summary = repeatDays ? getRepeatSummary(repeatDays) : null
      return summary ?? '커스텀'
    }
    default:
      return '매일'
  }
}
