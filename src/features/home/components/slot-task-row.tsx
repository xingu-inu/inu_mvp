'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { formatDuration, formatRepeatType } from '@/lib/utils/task-utils'
import type { HomeTask } from '@/types/entities'

interface SlotTaskRowProps {
  task: HomeTask
  isPast: boolean
  onClick: () => void
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function computeEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number)
  const totalMin = h * 60 + m + durationMinutes
  const endH = Math.floor(totalMin / 60) % 24
  const endM = totalMin % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

function buildTooltip(task: HomeTask, status: string | undefined | null): string {
  let tip = task.name
  if (task.specific_time) {
    const start = formatTime(task.specific_time)
    if (task.duration_minutes > 0) {
      const end = computeEndTime(task.specific_time, task.duration_minutes)
      tip += ` (${start} – ${end})`
    } else {
      tip += ` (${start})`
    }
  }
  const repeatLabel = formatRepeatType(task.repeat_type)
  if (repeatLabel) tip += ` · ${repeatLabel}`
  if (task.duration_minutes > 0) tip += ` · ${formatDuration(task.duration_minutes)}`
  if (task.streak_count > 0) tip += ` · 🔥${task.streak_count}`
  if (status === 'done') tip += ' - 완료'
  else if (status === 'skip') tip += ' - 건너뜀'
  return tip
}

function buildAriaLabel(task: HomeTask, status: string | undefined | null): string {
  let label = task.name
  if (task.specific_time) {
    const [h, m] = task.specific_time.split(':').map(Number)
    const period = h < 12 ? '오전' : '오후'
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
    label += `, ${period} ${displayH}시`
    if (m > 0) label += ` ${m}분`
  }
  const repeatLabel = formatRepeatType(task.repeat_type)
  if (repeatLabel) label += `, ${repeatLabel}`
  if (status === 'done') label += ', 완료됨'
  else if (status === 'skip') label += ', 건너뜀'
  return label
}

export const SlotTaskRow = memo(function SlotTaskRow({ task, isPast, onClick }: SlotTaskRowProps) {
  const status = task.todayCheckIn?.status
  const areaColor = task.goal?.area?.color ?? task.directArea?.color ?? '#64748b'
  const isCompletedOnce = task.taskStatus === 'completed' && task.repeat_type === 'once'
  const isDone = status === 'done' || isCompletedOnce
  const isSkip = status === 'skip'

  // Border color: status overrides area color
  const borderColor = isDone ? 'var(--color-done)' : isSkip ? 'var(--color-skip)' : areaColor

  return (
    <button
      onClick={onClick}
      title={buildTooltip(task, status)}
      aria-label={buildAriaLabel(task, status)}
      className={cn(
        'flex w-full items-center gap-1 rounded-[var(--chip-radius,8px)] border-l-[3px] px-2 py-[var(--chip-py,3px)] text-left transition-[opacity,border-color,background-color] duration-150',
        'min-h-[var(--chip-h,32px)]',
        'hover:brightness-[0.97] active:scale-[0.98]',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-primary-300)] focus-visible:outline-none',
        isDone && 'opacity-60',
        isSkip && 'opacity-40',
        !isDone && !isSkip && isPast && 'opacity-50'
      )}
      style={{
        borderLeftColor: borderColor,
        backgroundColor: `color-mix(in oklch, ${areaColor} var(--chip-tint-opacity, 10%), transparent)`,
      }}
    >
      {/* Status dot */}
      <span
        className={cn(
          'h-[var(--chip-status-size,5px)] w-[var(--chip-status-size,5px)] flex-shrink-0 rounded-full',
          isDone && 'bg-[var(--color-done)]',
          isSkip && 'bg-[var(--color-skip)]',
          !isDone && !isSkip && 'border border-[var(--color-border)]'
        )}
      />
      {/* Time badge - conditional */}
      {task.specific_time && (
        <span className="flex-shrink-0 text-[length:var(--chip-time-font-size,10px)] text-[var(--chip-time-color)] tabular-nums">
          {formatTime(task.specific_time)}
        </span>
      )}
      {/* Task name */}
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-[length:var(--chip-font-size,12px)] leading-[var(--chip-line-height,1.35)] font-medium text-[var(--color-text-primary)]',
          isDone && 'line-through'
        )}
      >
        {task.name}
      </span>
      {/* Metadata badges */}
      <div className="flex flex-shrink-0 items-center gap-1">
        {task.repeat_type !== 'once' &&
          (() => {
            const label = formatRepeatType(task.repeat_type)
            return label ? (
              <span className="text-[9px] leading-none text-[var(--color-text-disabled)]">
                {label}
              </span>
            ) : null
          })()}
        {task.duration_minutes > 0 && (
          <span className="text-[9px] leading-none text-[var(--color-text-disabled)] tabular-nums">
            {formatDuration(task.duration_minutes)}
          </span>
        )}
        {task.streak_count > 0 && (
          <span className="text-[9px] leading-none text-[var(--color-streak)]">
            🔥{task.streak_count}
          </span>
        )}
      </div>
    </button>
  )
})
