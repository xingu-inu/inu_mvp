'use client'

import { isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { HOUR_HEIGHT, TOTAL_GRID_HEIGHT } from '@/lib/constants/time-slots'
import { WeekTaskBlock } from './week-task-block'
import { CurrentTimeIndicator } from './current-time-indicator'
import type { PositionedTask } from '../hooks/use-task-layout'

interface WeekDayColumnProps {
  day: Date
  currentDate: Date
  isToday: boolean
  positioned: PositionedTask[]
  onTaskClick: (taskId: string, day: Date) => void
}

/**
 * Single day column in the 24-hour grid.
 * Renders hour gridlines + absolutely positioned task blocks + time indicator.
 */
export function WeekDayColumn({
  day,
  currentDate,
  isToday,
  positioned,
  onTaskClick,
}: WeekDayColumnProps) {
  const isSelected = isSameDay(day, currentDate)

  return (
    <div
      className={cn(
        'relative border-l border-[var(--color-border)]',
        isToday && !isSelected && 'bg-[var(--color-primary-50)]/10',
        isSelected && 'bg-[var(--color-primary-50)]/20'
      )}
      style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
    >
      {/* 30-minute gridlines (subtle) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            transparent,
            transparent ${HOUR_HEIGHT / 2 - 1}px,
            var(--color-border) ${HOUR_HEIGHT / 2 - 1}px,
            var(--color-border) ${HOUR_HEIGHT / 2}px
          )`,
        }}
      />
      {/* Hour gridlines (stronger) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            transparent,
            transparent ${HOUR_HEIGHT - 1}px,
            var(--color-border) ${HOUR_HEIGHT - 1}px,
            var(--color-border) ${HOUR_HEIGHT}px
          )`,
        }}
      />

      {/* Current time indicator (today only) */}
      {isToday && <CurrentTimeIndicator />}

      {/* Task blocks */}
      <div className="absolute inset-0 px-1">
        {positioned.map((pt) => (
          <WeekTaskBlock
            key={pt.task.id}
            task={pt.task}
            onClick={() => onTaskClick(pt.task.id, day)}
            positionStyle={{
              top: pt.topPx,
              height: pt.heightPx,
              left: `${pt.leftPercent}%`,
              width: `${pt.widthPercent}%`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
