'use client'

import { useMemo } from 'react'
import { Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DDayBadge } from '@/components/ui/badge'
import { Chip } from '@/components/ui/chip'
import type { Goal } from '@/types/entities'

interface MobileGoalCardProps {
  goal: Goal
  onClick: () => void
}

export function MobileGoalCard({ goal, onClick }: MobileGoalCardProps) {
  const summary = useMemo(() => {
    const tasks = goal.tasks ?? []
    const activeTasks = tasks.filter((t) => t.is_active)
    const today = new Date().toISOString().split('T')[0]
    const doneTodayCount = activeTasks.filter((t) =>
      t.check_ins?.some((c) => c.date === today && c.status === 'done')
    ).length
    const totalActive = activeTasks.length
    const bestStreak = Math.max(0, ...activeTasks.map((t) => t.streak_count))

    return { doneTodayCount, totalActive, bestStreak }
  }, [goal.tasks])

  const area = goal.area
  const progressPercent =
    summary.totalActive > 0 ? Math.round((summary.doneTodayCount / summary.totalActive) * 100) : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full rounded-2xl bg-[var(--color-bg-primary)] text-left',
        'border border-[var(--color-border)] shadow-[var(--shadow-card)]',
        'transition-all active:scale-[0.98]',
        'overflow-hidden'
      )}
    >
      {/* Area color bar (left) */}
      <div
        className="w-1 shrink-0 rounded-l-2xl"
        style={{ backgroundColor: area?.color ?? 'var(--color-primary-500)' }}
      />

      {/* Card content */}
      <div className="min-w-0 flex-1 px-4 py-3">
        {/* Row 1: Goal name + D-Day */}
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 shrink-0 text-[var(--color-primary-500)]" />
          <span className="flex-1 truncate text-[15px] font-semibold text-[var(--color-text-primary)]">
            {goal.name}
          </span>
          {goal.target_date && <DDayBadge targetDate={goal.target_date} />}
        </div>

        {/* Row 2: Mini progress bar */}
        {summary.totalActive > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary-500)] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-[var(--color-text-tertiary)] tabular-nums">
              {summary.doneTodayCount}/{summary.totalActive}
            </span>
          </div>
        )}

        {/* Row 3: Area chip + Streak */}
        <div className="mt-2 flex items-center gap-2">
          {area && (
            <Chip variant="area" emoji={area.emoji} color={area.color} className="text-xs">
              {area.name}
            </Chip>
          )}
          {summary.bestStreak > 0 && (
            <span className="rounded-full bg-[var(--color-streak-bg)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-streak)]">
              🔥 {summary.bestStreak}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
