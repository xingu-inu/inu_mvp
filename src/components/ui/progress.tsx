import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  showLabel?: boolean
}

const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ value, max = 100, showLabel, className, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)} {...props}>
        <div className="h-2 flex-1 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary-500)] transition-all duration-[var(--duration-slow)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <span className="font-mono text-sm text-[var(--color-text-secondary)] tabular-nums">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    )
  }
)
ProgressBar.displayName = 'ProgressBar'

export { ProgressBar }
