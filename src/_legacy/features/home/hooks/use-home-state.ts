'use client'

import { useMemo, useCallback, useEffect } from 'react'
import { parseAsString, useQueryStates } from 'nuqs'
import {
  format,
  parseISO,
  isValid,
  startOfDay,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isToday,
  getWeekOfMonth,
} from 'date-fns'
import { usePanelDateStore } from '@/stores/panel-date.store'

export type HomeView = 'week' | 'month'

const dateParser = parseAsString.withDefault(format(new Date(), 'yyyy-MM-dd'))
const viewParser = parseAsString.withDefault('week')

/**
 * Unified state hook for Home screen
 * Manages date + view navigation via URL params
 */
export function useHomeState() {
  const [params, setParams] = useQueryStates(
    {
      date: dateParser,
      view: viewParser,
    },
    { shallow: true }
  )

  const view = (params.view as HomeView) || 'week'

  // Parse the date string, fallback to today if invalid
  const currentDate = useMemo(() => {
    try {
      const parsed = parseISO(params.date)
      return isValid(parsed) ? parsed : new Date()
    } catch {
      return new Date()
    }
  }, [params.date])

  // Sync selected date to shared panel date store
  useEffect(() => {
    usePanelDateStore.getState().setSelectedDate(currentDate)
  }, [currentDate])

  const setCurrentDate = useCallback(
    (date: Date) => {
      const formatted = format(date, 'yyyy-MM-dd')
      if (format(new Date(), 'yyyy-MM-dd') === formatted) {
        setParams({ date: null })
      } else {
        setParams({ date: formatted })
      }
    },
    [setParams]
  )

  const setView = useCallback(
    (newView: HomeView) => {
      if (newView === 'week') {
        setParams({ view: null })
      } else {
        setParams({ view: newView })
      }
    },
    [setParams]
  )

  const goToToday = useCallback(() => {
    setParams({ date: null })
  }, [setParams])

  // Day navigation
  const goToPreviousDay = useCallback(() => {
    setCurrentDate(subDays(currentDate, 1))
  }, [currentDate, setCurrentDate])

  const goToNextDay = useCallback(() => {
    setCurrentDate(addDays(currentDate, 1))
  }, [currentDate, setCurrentDate])

  // Week navigation
  const goToPreviousWeek = useCallback(() => {
    setCurrentDate(subWeeks(currentDate, 1))
  }, [currentDate, setCurrentDate])

  const goToNextWeek = useCallback(() => {
    setCurrentDate(addWeeks(currentDate, 1))
  }, [currentDate, setCurrentDate])

  // Month navigation
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(subMonths(currentDate, 1))
  }, [currentDate, setCurrentDate])

  const goToNextMonth = useCallback(() => {
    setCurrentDate(addMonths(currentDate, 1))
  }, [currentDate, setCurrentDate])

  // Day-specific computed values
  const today = startOfDay(new Date())
  const selected = startOfDay(currentDate)
  const isViewingToday = isToday(currentDate)
  const isViewingPast = selected < today
  const isViewingFuture = selected > today

  const monthStart = useMemo(() => {
    return startOfMonth(currentDate)
  }, [currentDate])

  // Week range
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate])
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate])

  // Format titles per view
  const title = useMemo(() => {
    if (view === 'week') {
      const weekNum = getWeekOfMonth(currentDate, { weekStartsOn: 0 })
      const rangeStr = `${format(weekStart, 'M.d')} ~ ${format(weekEnd, 'M.d')}`
      return `${format(currentDate, 'M월')} ${weekNum}주 (${rangeStr})`
    }
    return format(currentDate, 'yyyy년 M월')
  }, [currentDate, view, weekStart, weekEnd])

  return {
    /** Current view mode */
    view,
    /** Set the view mode */
    setView,
    /** Current date being viewed */
    currentDate,
    /** Set the current date */
    setCurrentDate,
    /** Navigate to today */
    goToToday,
    /** Navigate to previous/next day */
    goToPreviousDay,
    goToNextDay,
    /** Navigate to previous/next week */
    goToPreviousWeek,
    goToNextWeek,
    /** Navigate to previous/next month */
    goToPreviousMonth,
    goToNextMonth,
    /** Whether viewing today */
    isViewingToday,
    /** Whether viewing a past date */
    isViewingPast,
    /** Whether viewing a future date */
    isViewingFuture,
    /** Start of current month */
    monthStart,
    /** Week range */
    weekStart,
    weekEnd,
    /** Formatted title for header */
    title,
  }
}
