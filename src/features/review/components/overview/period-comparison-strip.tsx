'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ComparisonData } from '../../hooks/use-comparison-data'

interface PeriodComparisonStripProps {
  comparison: ComparisonData
  isWeek: boolean
}

export function PeriodComparisonStrip({ comparison, isWeek }: PeriodComparisonStripProps) {
  if (!comparison.hasPrevData) return null

  const periodLabel = isWeek ? '지난 주' : '지난 달'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
    >
      <div className="mb-2 flex items-center gap-2">
        <ArrowLeftRight className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">
          {periodLabel} 대비
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ComparisonMetric label="실천율" delta={comparison.completionDelta} suffix="%p" />
        <ComparisonMetric label="활동일" delta={comparison.activeDaysDelta} suffix="일" />
        <ComparisonMetric label="기분" delta={comparison.moodDelta} suffix="" isMood />
      </div>
    </motion.div>
  )
}

function ComparisonMetric({
  label,
  delta,
  suffix,
  isMood = false,
}: {
  label: string
  delta: number | null
  suffix: string
  isMood?: boolean
}) {
  if (delta === null) {
    return (
      <div className="rounded-lg bg-[var(--color-bg-secondary)] px-2.5 py-2 text-center">
        <p className="text-[10px] font-medium text-[var(--color-text-tertiary)]">{label}</p>
        <p className="mt-0.5 text-sm text-[var(--color-text-tertiary)]">—</p>
      </div>
    )
  }

  const isPositive = delta > 0
  const isNeutral = delta === 0
  const displayDelta = isMood ? Math.abs(delta).toFixed(1) : Math.abs(delta)

  const getMessage = () => {
    if (isNeutral) return '유지 중'
    if (isPositive) return `+${isMood ? Math.abs(delta).toFixed(1) : delta}${suffix}`
    return `${displayDelta}${suffix}`
  }

  return (
    <div className="rounded-lg bg-[var(--color-bg-secondary)] px-2.5 py-2 text-center">
      <p className="text-[10px] font-medium text-[var(--color-text-tertiary)]">{label}</p>
      <div className="mt-0.5 flex items-center justify-center gap-1">
        {isNeutral ? (
          <Minus className="h-3 w-3 text-[var(--color-text-tertiary)]" />
        ) : isPositive ? (
          <TrendingUp className="h-3 w-3 text-[var(--color-done)]" />
        ) : (
          <TrendingDown className="h-3 w-3 text-[var(--color-text-tertiary)]" />
        )}
        <span
          className={cn(
            'text-sm font-semibold',
            isNeutral && 'text-[var(--color-text-tertiary)]',
            isPositive && 'text-[var(--color-done)]',
            !isPositive && !isNeutral && 'text-[var(--color-text-secondary)]'
          )}
        >
          {getMessage()}
        </span>
      </div>
      <p className="text-[10px] text-[var(--color-text-tertiary)]">
        {isNeutral ? '변화 없음' : isPositive ? '성장' : '쉬어가는 중'}
      </p>
    </div>
  )
}
