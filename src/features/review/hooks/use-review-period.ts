'use client'

import { parseAsStringEnum, parseAsInteger, useQueryState } from 'nuqs'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  format,
} from 'date-fns'
import { ko } from 'date-fns/locale'

export type ReviewPeriod = 'week' | 'month'

/**
 * Hook for managing the review period selection
 * Supports navigating to past/current periods
 * Syncs with URL for shareable links and browser navigation
 */
export function useReviewPeriod() {
  const [period, setPeriod] = useQueryState(
    'period',
    parseAsStringEnum<ReviewPeriod>(['week', 'month']).withDefault('week')
  )

  const [offset, setOffset] = useQueryState('offset', parseAsInteger.withDefault(0))

  const getDateRange = () => {
    const now = new Date()

    if (period === 'week') {
      const baseDate = offset === 0 ? now : addWeeks(now, offset)
      return {
        start: startOfWeek(baseDate, { weekStartsOn: 1 }),
        end: endOfWeek(baseDate, { weekStartsOn: 1 }),
      }
    } else {
      const baseDate = offset === 0 ? now : addMonths(now, offset)
      return {
        start: startOfMonth(baseDate),
        end: endOfMonth(baseDate),
      }
    }
  }

  const { start, end } = getDateRange()

  const handlePrevPeriod = () => {
    setOffset((prev) => (prev ?? 0) - 1)
  }

  const handleNextPeriod = () => {
    if (offset !== null && offset < 0) {
      const newOffset = offset + 1
      setOffset(newOffset === 0 ? null : newOffset)
    }
  }

  const handleGoToCurrent = () => {
    setOffset(null)
  }

  const handleSetPeriod = (newPeriod: ReviewPeriod) => {
    setPeriod(newPeriod)
    setOffset(null)
  }

  // Check if next period navigation is allowed (can't go past current)
  const canGoNext = offset !== null && offset < 0

  // Period label for display
  const getPeriodLabel = () => {
    if (period === 'week') {
      const weekStart = format(start, 'M.d', { locale: ko })
      const weekEnd = format(end, 'M.d', { locale: ko })
      return `${weekStart} - ${weekEnd}`
    } else {
      return format(start, 'yyyy년 M월', { locale: ko })
    }
  }

  const isCurrentPeriod = offset === 0 || offset === null

  return {
    period,
    setPeriod: handleSetPeriod,
    getDateRange,
    isWeek: period === 'week',
    isMonth: period === 'month',
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
    /** Navigate to previous period */
    handlePrevPeriod,
    /** Navigate to next period */
    handleNextPeriod,
    /** Go back to current period */
    handleGoToCurrent,
    /** Whether next navigation is allowed */
    canGoNext,
    /** Human-readable period label */
    periodLabel: getPeriodLabel(),
    /** Whether viewing the current period */
    isCurrentPeriod,
    /** Week start date for weekly reflection */
    weekStartDate: format(startOfWeek(start, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }
}
