'use client'

import { cn } from '@/lib/utils'

interface DeltaChipProps {
  label: string
  delta: number
  suffix: string
  isMood?: boolean
  className?: string
}

export function DeltaChip({ label, delta, suffix, isMood = false, className }: DeltaChipProps) {
  const isPositive = delta > 0
  const isNeutral = delta === 0
  const displayValue = isMood ? Math.abs(delta).toFixed(1) : Math.abs(delta)
  const sign = isPositive ? '+' : isNeutral ? '' : '-'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        isPositive && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        isNeutral && 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]',
        !isPositive &&
          !isNeutral &&
          'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
        className
      )}
    >
      <span>{label}</span>
      <span>
        {sign}
        {displayValue}
        {suffix}
      </span>
    </span>
  )
}
