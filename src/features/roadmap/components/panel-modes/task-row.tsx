'use client'

import { memo, useState, useMemo } from 'react'
import {
  ArrowRightLeft,
  CalendarDays,
  ChevronDown,
  Trash2,
  Edit2,
  Pause,
  Play,
  CheckCircle2,
  Footprints,
  Link,
} from 'lucide-react'
import { TaskPausePopover } from '../shared/task-pause-popover'
import { TaskMoveGoalPopover } from '../shared/task-move-goal-popover'
import { OverflowMenu, type OverflowMenuItem } from '../shared/overflow-menu'
import { TASK_STATUS_CONFIG } from '@/lib/task-status'
import { cn } from '@/lib/utils'
import type { Area, Task, TaskStatus } from '@/types/entities'

function formatPeriod(startDate: string | null, endDate: string | null): string | null {
  if (!startDate) return null
  const fmt = (d: string) => {
    const date = new Date(d + 'T00:00:00')
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`
  }
  return endDate ? `${fmt(startDate)}~${fmt(endDate)}` : `${fmt(startDate)}~`
}

export const TaskRow = memo(function TaskRow({
  task,
  areaMap,
  goalId,
  onEdit,
  onDelete,
  onStatusChange,
  isExpanded,
  onToggle,
}: {
  task: Task
  areaMap: Map<string, Area>
  goalId: string
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: TaskStatus, reason?: string, note?: string) => void
  isExpanded?: boolean
  onToggle?: () => void
}) {
  const [showPausePopover, setShowPausePopover] = useState(false)
  const [showMovePopover, setShowMovePopover] = useState(false)

  const period = formatPeriod(task.start_date, task.end_date)
  const statusConfig = task.status !== 'active' ? TASK_STATUS_CONFIG[task.status] : null

  const linkedAreas = task.related_area_ids
    ?.map((id) => areaMap.get(id))
    .filter((a): a is Area => !!a)

  const overflowItems = useMemo((): OverflowMenuItem[] => {
    const items: OverflowMenuItem[] = []

    if (task.status === 'active') {
      items.push({
        label: '일시 정지',
        icon: <Pause className="h-4 w-4" />,
        onClick: () => setShowPausePopover(true),
      })
    }

    items.push({
      label: '수정',
      icon: <Edit2 className="h-4 w-4" />,
      onClick: onEdit,
    })

    items.push({
      label: '이동',
      icon: <ArrowRightLeft className="h-4 w-4" />,
      onClick: () => setShowMovePopover(true),
    })

    items.push({
      label: '삭제',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      variant: 'danger',
    })

    return items
  }, [task.status, onEdit, onDelete])

  return (
    <div
      className={cn(
        'group/task flex items-center rounded-md bg-[var(--color-bg-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]',
        task.status === 'paused' && 'opacity-50',
        task.status === 'completed' && 'opacity-50',
        isExpanded && 'bg-[var(--color-bg-secondary)]'
      )}
    >
      <div
        className={cn('flex flex-1 flex-col px-2.5 py-2', onToggle && 'cursor-pointer')}
        onClick={onToggle}
      >
        {/* Line 1: name + status badge + streak */}
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Footprints className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-tertiary)]" />
            <span
              className={cn(
                'flex-1 truncate text-sm font-medium',
                task.status === 'completed' && 'line-through'
              )}
            >
              {task.name}
            </span>
            {statusConfig && (
              <span
                className={cn(
                  'shrink-0 rounded px-1.5 py-0.5 text-[10px] leading-none font-medium',
                  statusConfig.bg,
                  statusConfig.text
                )}
              >
                {statusConfig.label}
              </span>
            )}
          </div>
          {task.streak_count > 0 && (
            <span className="shrink-0 text-xs text-[var(--color-streak)]">
              🔥 {task.streak_count}
            </span>
          )}
        </div>
        {/* Line 2: period */}
        {period && (
          <div className="mt-0.5 flex items-center gap-1">
            <CalendarDays className="h-3 w-3 shrink-0 text-[var(--color-text-tertiary)]" />
            <p className="truncate text-[11px] text-[var(--color-text-tertiary)]">{period}</p>
          </div>
        )}
        {/* Line 3: cross-linked areas (conditional) */}
        {linkedAreas && linkedAreas.length > 0 && (
          <div className="mt-0.5 flex items-center gap-1">
            <Link className="h-2.5 w-2.5 shrink-0 text-[var(--color-text-tertiary)]" />
            <p className="truncate text-[11px] text-[var(--color-text-tertiary)]">
              {linkedAreas.map((a) => `${a.emoji} ${a.name}`).join(' · ')}
            </p>
          </div>
        )}
      </div>
      <TaskMoveGoalPopover
        taskId={task.id}
        currentGoalId={goalId}
        open={showMovePopover}
        onOpenChange={setShowMovePopover}
      >
        <div className="flex shrink-0 items-center gap-1 pr-1.5 lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/task:opacity-100">
          {/* Direct status buttons */}
          {task.status === 'active' && task.repeat_type === 'once' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStatusChange('completed')
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="완료"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--color-done)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          )}
          {(task.status === 'paused' || task.status === 'completed') && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStatusChange('active')
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="다시 시작"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--color-primary-500)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}
          {/* Overflow menu */}
          <OverflowMenu
            items={overflowItems}
            hoverGroupClass="group-hover/task:opacity-100"
            triggerClassName="h-7 w-7"
          />
        </div>
      </TaskMoveGoalPopover>

      {/* Expand/collapse chevron */}
      {onToggle && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={isExpanded ? '접기' : '펼치기'}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-all hover:bg-[var(--color-bg-tertiary)]"
        >
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      )}

      {/* TaskPausePopover — rendered outside the menu to avoid nested popovers */}
      <TaskPausePopover
        taskName={task.name}
        onConfirm={(reason, note) => {
          onStatusChange('paused', reason, note)
          setShowPausePopover(false)
        }}
        controlledOpen={showPausePopover}
        onOpenChange={setShowPausePopover}
        trigger={<span />}
      />
    </div>
  )
})
