'use client'

import { format, isBefore, isSameDay, isToday, startOfToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useHomeState } from '../hooks/use-home-state'
import { useWeekTasks } from '../hooks/use-week-tasks'
import { useHomeDirection } from '../hooks/use-home-direction'

interface CompactWeekStripProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  directionId?: string
}

/**
 * Compact 7-day week strip for mobile — Todomate-style.
 * Shows weekday, date number, and completion progress for each day.
 * Tapping a day updates the selected date → task list below refreshes.
 *
 * Accepts optional controlled props; falls back to useHomeState when not provided.
 */
export function CompactWeekStrip({
  selectedDate: externalDate,
  onDateSelect,
  directionId: externalDirectionId,
}: CompactWeekStripProps = {}) {
  const { currentDate: internalDate, setCurrentDate: internalSetDate } = useHomeState()
  const { selectedDirectionId } = useHomeDirection()

  const currentDate = externalDate ?? internalDate
  const setCurrentDate = onDateSelect ?? internalSetDate
  const directionId = externalDate ? externalDirectionId : (selectedDirectionId ?? undefined)

  const { tasksByDate, weekDays, isLoading } = useWeekTasks(currentDate, directionId)

  if (isLoading) {
    return <WeekStripSkeleton />
  }

  return (
    <div className="grid grid-cols-7 rounded-2xl bg-[var(--color-bg-secondary)]/50 px-1 py-1.5">
      {weekDays.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const isSelected = isSameDay(day, currentDate)
        const isDayToday = isToday(day)
        const isDayPast = isBefore(day, startOfToday())
        const dayTasks = tasksByDate[dateStr] ?? []
        const totalCount = dayTasks.length
        const doneCount = dayTasks.filter((t) => t.todayCheckIn?.status === 'done').length
        const skipCount = dayTasks.filter((t) => t.todayCheckIn?.status === 'skip').length

        return (
          <button
            key={dateStr}
            onClick={() => setCurrentDate(day)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl px-0.5 py-1.5 transition-colors',
              'active:scale-95',
              isSelected && !isDayToday && 'bg-[var(--color-primary-50)]'
            )}
          >
            {/* Weekday label */}
            <span
              className={cn(
                'text-[11px] font-medium',
                isDayToday ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-text-tertiary)]'
              )}
            >
              {format(day, 'EEE', { locale: ko })}
            </span>

            {/* Date number */}
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                isDayToday && 'bg-[var(--color-primary-500)] text-white',
                isSelected &&
                  !isDayToday &&
                  'bg-[var(--color-primary-100)] text-[var(--color-primary-600)]',
                !isDayToday && !isSelected && 'text-[var(--color-text-primary)]'
              )}
            >
              {format(day, 'd')}
            </span>

            {/* Completion indicator */}
            {totalCount > 0 ? (
              <div className="flex flex-col items-center gap-0.5">
                {/* Segmented progress bar */}
                <div className="flex h-[3px] w-5 overflow-hidden rounded-full bg-[var(--color-border)]">
                  {doneCount > 0 && (
                    <span
                      className="h-full bg-[var(--color-done)]"
                      style={{ width: `${(doneCount / totalCount) * 100}%` }}
                    />
                  )}
                  {skipCount > 0 && (
                    <span
                      className="h-full bg-[var(--color-skip)]"
                      style={{ width: `${(skipCount / totalCount) * 100}%` }}
                    />
                  )}
                </div>
                {/* Count label for past days */}
                {isDayPast && (
                  <span className="text-[10px] text-[var(--color-text-disabled)] tabular-nums">
                    {doneCount}/{totalCount}
                  </span>
                )}
              </div>
            ) : (
              /* Empty spacer to keep consistent height */
              <div className="h-[3px]" />
            )}
          </button>
        )
      })}
    </div>
  )
}

function WeekStripSkeleton() {
  return (
    <div className="grid grid-cols-7 rounded-2xl bg-[var(--color-bg-secondary)]/50 px-1 py-1.5">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-1 px-0.5 py-2">
          <div className="h-3 w-4 animate-pulse rounded bg-[var(--color-bg-secondary)]" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--color-bg-secondary)]" />
          <div className="h-[3px] w-5 animate-pulse rounded-full bg-[var(--color-bg-secondary)]" />
        </div>
      ))}
    </div>
  )
}
