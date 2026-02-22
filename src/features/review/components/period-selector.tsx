'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useReviewPeriod } from '../hooks/use-review-period'
import { cn } from '@/lib/utils'

export function PeriodSelector() {
  const {
    period,
    setPeriod,
    handlePrevPeriod,
    handleNextPeriod,
    handleGoToCurrent,
    canGoNext,
    periodLabel,
    isCurrentPeriod,
  } = useReviewPeriod()

  return (
    <div className="space-y-3">
      {/* Period Type Toggle */}
      <div className="border-border flex overflow-hidden rounded-lg border">
        <button
          onClick={() => setPeriod('week')}
          className={cn(
            'min-h-[44px] flex-1 px-4 py-2 text-sm font-medium transition-colors',
            period === 'week'
              ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
          )}
          aria-pressed={period === 'week'}
        >
          주간
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={cn(
            'min-h-[44px] flex-1 px-4 py-2 text-sm font-medium transition-colors',
            period === 'month'
              ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
          )}
          aria-pressed={period === 'month'}
        >
          월간
        </button>
      </div>

      {/* Period Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevPeriod}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
          aria-label={`이전 ${period === 'week' ? '주' : '달'}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={handleGoToCurrent}
          disabled={isCurrentPeriod}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            isCurrentPeriod
              ? 'cursor-default text-[var(--color-text-primary)]'
              : 'cursor-pointer text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)]'
          )}
        >
          {periodLabel}
        </button>

        <button
          onClick={handleNextPeriod}
          disabled={!canGoNext}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-lg transition-colors',
            canGoNext
              ? 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
              : 'cursor-not-allowed text-[var(--color-text-tertiary)] opacity-30'
          )}
          aria-label={`다음 ${period === 'week' ? '주' : '달'}`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
