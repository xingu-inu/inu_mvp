'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useHomeState } from '../hooks/use-home-state'
import { HomeViewToggle } from './home-view-toggle'
import { Button } from '@/components/ui/button'

export function HomeHeader() {
  const {
    view,
    goToPreviousWeek,
    goToNextWeek,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    isViewingToday,
    title,
  } = useHomeState()

  const goToPrevious = view === 'week' ? goToPreviousWeek : goToPreviousMonth
  const goToNext = view === 'week' ? goToNextWeek : goToNextMonth
  const prevLabel = view === 'week' ? '이전 주' : '이전 달'
  const nextLabel = view === 'week' ? '다음 주' : '다음 달'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevious}
            className="touch-target rounded-lg p-2 transition-colors hover:bg-[var(--color-bg-secondary)]"
            aria-label={prevLabel}
          >
            <ChevronLeft className="h-5 w-5 text-[var(--color-text-secondary)]" />
          </button>
          <button
            onClick={goToNext}
            className="touch-target rounded-lg p-2 transition-colors hover:bg-[var(--color-bg-secondary)]"
            aria-label={nextLabel}
          >
            <ChevronRight className="h-5 w-5 text-[var(--color-text-secondary)]" />
          </button>
          <h1 className="ml-1 text-lg font-bold text-[var(--color-text-primary)] lg:text-xl">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {!isViewingToday && (
            <Button
              variant="secondary"
              size="sm"
              onClick={goToToday}
              className="text-[var(--color-primary-500)]"
            >
              오늘
            </Button>
          )}
          <HomeViewToggle />
        </div>
      </div>
    </div>
  )
}
