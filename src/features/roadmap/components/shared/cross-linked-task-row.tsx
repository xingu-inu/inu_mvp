'use client'

import { memo } from 'react'
import { Link, Link2Off, Calendar1, Repeat } from 'lucide-react'
import type { Task } from '@/types/entities'

interface CrossLinkedTaskRowProps {
  task: Task
  sourceGoalId?: string
  sourceGoalName: string
  sourceAreaEmoji: string
  sourceAreaColor: string
  onUnlink: () => void
  onNavigate: () => void
  /** 'default' uses sm text/py-2, 'compact' uses xs text/py-1.5 */
  size?: 'default' | 'compact'
}

export const CrossLinkedTaskRow = memo(function CrossLinkedTaskRow({
  task,
  sourceGoalName,
  sourceAreaEmoji,
  sourceAreaColor,
  onUnlink,
  onNavigate,
  size = 'default',
}: CrossLinkedTaskRowProps) {
  const RepeatIcon = task.repeat_type === 'once' ? Calendar1 : Repeat
  const isCompact = size === 'compact'

  return (
    <div
      className="group/cross flex cursor-pointer items-center rounded-md border-l-2 border-dashed bg-[var(--color-bg-secondary)]/30 transition-colors hover:bg-[var(--color-bg-secondary)]"
      style={{ borderLeftColor: sourceAreaColor || 'var(--color-border)' }}
      onClick={onNavigate}
    >
      <div className={`flex flex-1 flex-col px-2.5 ${isCompact ? 'py-1.5' : 'py-2'}`}>
        {/* Line 1: link icon + name + streak */}
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Link
              className={`${isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} shrink-0 text-[var(--color-text-tertiary)]`}
            />
            <RepeatIcon
              className={`${isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} shrink-0 text-[var(--color-text-tertiary)]`}
            />
            <span className={`flex-1 truncate ${isCompact ? 'text-xs' : 'text-sm'} font-medium`}>
              {task.name}
            </span>
          </div>
          {task.streak_count > 0 && (
            <span
              className={`shrink-0 ${isCompact ? 'text-[10px]' : 'text-xs'} text-[var(--color-streak)]`}
            >
              🔥 {task.streak_count}
            </span>
          )}
        </div>
        {/* Line 2: source goal */}
        <div className="mt-0.5 flex items-center gap-1 pl-[30px]">
          <p
            className={`truncate ${isCompact ? 'text-[10px]' : 'text-[11px]'} text-[var(--color-text-tertiary)]`}
          >
            ← {sourceAreaEmoji} {sourceGoalName}
          </p>
        </div>
      </div>
      {/* Unlink button (hover only) */}
      <div className="flex shrink-0 items-center pr-1.5 lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/cross:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onUnlink()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="연결 해제"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-miss)]"
        >
          <Link2Off className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
})
