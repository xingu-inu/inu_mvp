'use client'

import { ProgressBar } from '@/components/ui/progress'
import { calculateTaskStats, getProgressTier } from '@/lib/utils/task-utils'
import { cn } from '@/lib/utils'
import type { HomeTask } from '@/types/entities'

interface ProgressSummaryProps {
  tasks: HomeTask[]
  variant?: 'default' | 'compact'
}

export function ProgressSummary({ tasks, variant = 'compact' }: ProgressSummaryProps) {
  const stats = calculateTaskStats(tasks)
  const tierInfo = getProgressTier(tasks)

  if (stats.total === 0) return null

  const donePercent = (stats.completed / stats.total) * 100
  const skipPercent = (stats.skipped / stats.total) * 100

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl px-4 py-3 transition-colors duration-500',
          tierInfo.tier === 'start' && 'bg-[var(--color-bg-secondary)]/50',
          tierInfo.tier === 'going' && 'bg-[var(--color-done)]/5',
          tierInfo.tier === 'halfway' && 'bg-[var(--color-done)]/8',
          tierInfo.tier === 'almost' && 'bg-[var(--color-done)]/12',
          tierInfo.tier === 'done' && 'bg-[var(--color-done)]/15',
          !tierInfo.tier || tierInfo.tier === 'empty' ? 'bg-[var(--color-bg-secondary)]/50' : ''
        )}
      >
        <span className="shrink-0 font-mono text-lg font-bold text-[var(--color-primary-500)]">
          {stats.completed}/{stats.total}
        </span>
        {/* Stacked progress bar: done (green) + skip (gray) */}
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
          <div className="flex h-full">
            <div
              className={cn(
                'h-full bg-[var(--color-done)] transition-all duration-500',
                tierInfo.tier === 'almost' && 'animate-pulse'
              )}
              style={{ width: `${donePercent}%` }}
            />
            <div
              className="h-full bg-[var(--color-skip)] transition-all duration-500"
              style={{ width: `${skipPercent}%` }}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
          {stats.completed > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[var(--color-done)]" />
              {stats.completed}
            </span>
          )}
          {stats.skipped > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[var(--color-skip)]" />
              {stats.skipped}
            </span>
          )}
          {stats.remaining > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[var(--color-border)]" />
              {stats.remaining}
            </span>
          )}
        </div>
      </div>
    )
  }

  // Default (full) variant — kept for potential reuse
  return (
    <div className="rounded-2xl bg-[var(--color-bg-secondary)] p-4 text-center lg:flex lg:items-center lg:justify-between lg:text-left">
      <div className="lg:flex-1">
        <div className="mb-2 font-mono text-4xl font-extrabold text-[var(--color-primary-500)] lg:text-5xl">
          {stats.completed}/{stats.total}
        </div>
        <p className="mb-4 text-sm text-[var(--color-text-secondary)] lg:mb-3 lg:text-base">
          완료한 Task
        </p>
        <ProgressBar value={stats.completed} max={stats.total} className="lg:max-w-xs" />
      </div>

      <div className="mt-4 flex justify-center gap-6 text-sm lg:mt-0 lg:flex-col lg:gap-3 lg:text-base">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-done)]" />
          <span className="text-[var(--color-text-secondary)]">{stats.completed} 완료</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-skip)]" />
          <span className="text-[var(--color-text-secondary)]">{stats.skipped} 건너뜀</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-border)]" />
          <span className="text-[var(--color-text-secondary)]">{stats.remaining} 남음</span>
        </div>
      </div>
    </div>
  )
}
