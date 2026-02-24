'use client'

import { cn } from '@/lib/utils'

interface CompletionBarProps {
  rate: number
  color?: string
  className?: string
}

export function CompletionBar({ rate, color, className }: CompletionBarProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <span className="text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
        완료율
      </span>
      <div className="flex items-center gap-3">
        <div className="h-3 flex-1 rounded-full bg-[var(--color-bg-tertiary)]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.round(rate)}%`,
              backgroundColor: color ?? 'var(--color-primary-500)',
            }}
          />
        </div>
        <span className="w-10 text-right font-mono text-sm font-semibold text-[var(--color-text-primary)]">
          {Math.round(rate)}%
        </span>
      </div>
    </div>
  )
}
