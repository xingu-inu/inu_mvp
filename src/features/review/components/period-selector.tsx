'use client'

import { motion } from 'framer-motion'
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
      <div className="relative flex rounded-xl bg-[var(--color-bg-secondary)] p-1">
        <button
          onClick={() => setPeriod('week')}
          className={cn(
            'relative z-10 min-h-[44px] flex-1 px-4 py-2 text-sm font-medium transition-colors',
            period === 'week'
              ? 'text-[var(--color-primary-600)]'
              : 'text-[var(--color-text-secondary)]'
          )}
          aria-pressed={period === 'week'}
        >
          {period === 'week' && (
            <motion.div
              layoutId="review-period-pill"
              className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-[var(--color-bg-card)]"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">주간</span>
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={cn(
            'relative z-10 min-h-[44px] flex-1 px-4 py-2 text-sm font-medium transition-colors',
            period === 'month'
              ? 'text-[var(--color-primary-600)]'
              : 'text-[var(--color-text-secondary)]'
          )}
          aria-pressed={period === 'month'}
        >
          {period === 'month' && (
            <motion.div
              layoutId="review-period-pill"
              className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-[var(--color-bg-card)]"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">월간</span>
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
