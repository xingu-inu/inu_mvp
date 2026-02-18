'use client'

import { Flame, Star, Check, SkipForward, Link, Clock } from 'lucide-react'
import { Chip } from '@/components/ui/chip'
import type { HomeTask } from '@/types/entities'

// ============================================
// ReadOnlyTaskDetail — expanded read-only view
// ============================================

interface ReadOnlyTaskDetailProps {
  task: HomeTask
}

export function ReadOnlyTaskDetail({ task }: ReadOnlyTaskDetailProps) {
  const breadcrumb = task.goal
    ? [
        task.goal.area?.emoji
          ? `${task.goal.area.emoji} ${task.goal.area.name}`
          : task.goal.area?.name,
        task.goal.name,
        task.group?.name,
      ]
        .filter(Boolean)
        .join(' > ')
    : null

  const status = task.todayCheckIn?.status

  return (
    <div className="space-y-3 rounded-b-lg bg-[var(--color-bg-secondary)] px-4 py-3">
      {/* Breadcrumb */}
      {breadcrumb && <p className="text-xs text-[var(--color-text-tertiary)]">{breadcrumb}</p>}

      {/* Cross-linked areas */}
      {task.relatedAreas && task.relatedAreas.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Link className="h-3 w-3 flex-shrink-0 text-[var(--color-text-tertiary)]" />
          <div className="flex flex-wrap gap-1">
            {task.relatedAreas.map((area) => (
              <Chip key={area.id} variant="area" emoji={area.emoji} color={area.color}>
                {area.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Why */}
      {task.why && (
        <p className="flex items-start gap-1.5 text-sm text-[var(--color-text-tertiary)] italic">
          <span className="shrink-0">💭</span>
          <span>{task.why}</span>
        </p>
      )}

      {/* Status indicator (when already checked in) */}
      {status && (
        <div
          className={
            'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium' +
            (status === 'done'
              ? ' bg-[var(--color-done-bg)] text-[var(--color-done)]'
              : status === 'skip'
                ? ' bg-[var(--color-skip-bg)] text-[var(--color-skip)]'
                : '')
          }
        >
          {status === 'done' ? <Check className="h-4 w-4" /> : <SkipForward className="h-4 w-4" />}
          {status === 'done' ? '완료' : '건너뜀'}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-[var(--color-text-tertiary)]">
        <span className="flex items-center gap-1">
          <Flame className="h-3.5 w-3.5 text-[var(--color-streak)]" />
          {task.streak_count}일
        </span>
        <span className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5" />
          {task.best_streak}일
        </span>
        <span className="flex items-center gap-1">
          <Check className="h-3.5 w-3.5" />
          {task.total_completed}회
        </span>
        {task.duration_minutes != null && task.duration_minutes > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {task.duration_minutes}분
          </span>
        )}
      </div>
    </div>
  )
}
