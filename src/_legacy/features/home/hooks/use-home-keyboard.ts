'use client'

import { useCallback, useEffect } from 'react'
import { useHomeState } from './use-home-state'

/**
 * Hook for keyboard navigation on the Home screen.
 *
 * Shortcuts:
 * - Arrow Left/Right: Week → week, Month → month
 * - Arrow Up/Down: Always navigate by week
 * - t: Go to today
 * - 1/2: Switch to Week/Month view
 */
export function useHomeKeyboard() {
  const {
    view,
    setView,
    goToToday,
    goToPreviousWeek,
    goToNextWeek,
    goToPreviousMonth,
    goToNextMonth,
  } = useHomeState()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if inside input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          if (view === 'week') goToPreviousWeek()
          else goToPreviousMonth()
          break
        case 'ArrowRight':
          e.preventDefault()
          if (view === 'week') goToNextWeek()
          else goToNextMonth()
          break
        case 'ArrowUp':
          e.preventDefault()
          goToPreviousWeek()
          break
        case 'ArrowDown':
          e.preventDefault()
          goToNextWeek()
          break
        case 't':
          e.preventDefault()
          goToToday()
          break
        case '1':
          e.preventDefault()
          setView('week')
          break
        case '2':
          e.preventDefault()
          setView('month')
          break
      }
    },
    [view, setView, goToToday, goToPreviousWeek, goToNextWeek, goToPreviousMonth, goToNextMonth]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
