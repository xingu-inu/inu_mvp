import { forwardRef, useMemo } from 'react'
import { differenceInDays, parseISO, startOfDay } from 'date-fns'
import { cn } from '@/lib/utils'

interface StreakBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number
  animate?: boolean
  /** Show amber glow for at-risk streaks */
  atRisk?: boolean
}

const StreakBadge = forwardRef<HTMLSpanElement, StreakBadgeProps>(
  ({ count, animate, atRisk, className, ...props }, ref) => {
    if (count === 0) return null

    const isHigh = count >= 14

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono font-semibold',
          // Tier-based styling
          isHigh
            ? 'bg-[var(--color-streak-high-bg)] text-sm text-[var(--color-streak-high)]'
            : 'bg-[var(--color-streak-bg)] text-sm text-[var(--color-streak)]',
          // At-risk glow
          atRisk && 'ring-2 ring-[var(--color-streak-ring)]',
          animate && 'animate-streak-pop',
          className
        )}
        {...props}
      >
        <span>🔥</span>
        <span className="tabular-nums">{count}</span>
      </span>
    )
  }
)
StreakBadge.displayName = 'StreakBadge'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// D-Day Badge
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface DDayBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  targetDate: string // ISO date string (YYYY-MM-DD)
}

const DDayBadge = forwardRef<HTMLSpanElement, DDayBadgeProps>(
  ({ targetDate, className, ...props }, ref) => {
    const { label, variant } = useMemo(() => {
      const today = startOfDay(new Date())
      const target = startOfDay(parseISO(targetDate))
      const days = differenceInDays(target, today)

      const lbl = days > 0 ? `D-${days}` : days === 0 ? 'D-Day' : `D+${Math.abs(days)}`
      const v = days <= 0 ? 'overdue' : days <= 3 ? 'urgent' : 'default'
      return { label: lbl, variant: v as 'overdue' | 'urgent' | 'default' }
    }, [targetDate])

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
          variant === 'urgent'
            ? 'bg-[var(--color-miss-bg)] text-[var(--color-miss)]'
            : variant === 'overdue'
              ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
          className
        )}
        {...props}
      >
        <span>📅</span>
        <span>{label}</span>
      </span>
    )
  }
)
DDayBadge.displayName = 'DDayBadge'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Period Badge (start ~ target date)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PeriodBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  startDate?: string | null
  targetDate?: string | null
  /** compact: "3/22~4/15", full: "3월 22일 ~ 4월 15일" */
  compact?: boolean
}

const PeriodBadge = forwardRef<HTMLSpanElement, PeriodBadgeProps>(
  ({ startDate, targetDate, compact = true, className, ...props }, ref) => {
    const result = useMemo(() => {
      if (!startDate && !targetDate) return null

      const fmt = (iso: string) => {
        const d = parseISO(iso)
        return compact
          ? `${d.getMonth() + 1}/${d.getDate()}`
          : `${d.getMonth() + 1}월 ${d.getDate()}일`
      }

      const sep = compact ? '~' : ' ~ '
      let label: string
      if (startDate && targetDate) {
        label = `${fmt(startDate)}${sep}${fmt(targetDate)}`
      } else if (targetDate) {
        label = `${sep}${fmt(targetDate)}`
      } else if (startDate) {
        label = `${fmt(startDate)}${sep}`
      } else {
        return null
      }

      // Urgency: target within 7 days or overdue
      let variant: 'urgent' | 'overdue' | 'default' = 'default'
      if (targetDate) {
        const days = differenceInDays(startOfDay(parseISO(targetDate)), startOfDay(new Date()))
        if (days < 0) variant = 'overdue'
        else if (days <= 7) variant = 'urgent'
      }

      return { label, variant }
    }, [startDate, targetDate, compact])

    if (!result) return null

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
          result.variant === 'urgent'
            ? 'bg-[var(--color-miss-bg)] text-[var(--color-miss)]'
            : result.variant === 'overdue'
              ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] line-through'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
          className
        )}
        {...props}
      >
        {result.label}
      </span>
    )
  }
)
PeriodBadge.displayName = 'PeriodBadge'

export { StreakBadge, DDayBadge, PeriodBadge }
