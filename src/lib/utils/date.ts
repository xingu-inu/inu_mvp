import { startOfDay, differenceInDays } from 'date-fns'

/**
 * Calculate days remaining until a target date
 * Returns null if no target date is provided
 * Returns 0 if target date is in the past
 */
export function calculateDaysLeft(targetDate: string | null | undefined): number | null {
  if (!targetDate) return null

  const target = new Date(targetDate)
  const today = startOfDay(new Date())
  const days = differenceInDays(target, today)

  return Math.max(0, days)
}

/**
 * Format a date as D-day string
 */
export function formatDDay(targetDate: string | null | undefined): string | null {
  const days = calculateDaysLeft(targetDate)
  if (days === null) return null
  if (days === 0) return 'D-Day'
  return `D-${days}`
}
