'use client'

import { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
  isToday,
  isFuture,
} from 'date-fns'
import { cn } from '@/lib/utils'
import { useHomeState } from '../hooks/use-home-state'
import {
  useMonthSummary,
  type MonthDaySummary,
  type AreaDayInfo,
  type MonthTaskPreview,
} from '../hooks/use-month-summary'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// SVG progress ring constants
const RING_SIZE = 32
const RING_RADIUS = 13
const RING_STROKE = 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

/**
 * Mini SVG progress ring around the date number.
 */
function ProgressRing({ rate, isPerfect }: { rate: number; isPerfect: boolean }) {
  const offset = RING_CIRCUMFERENCE * (1 - Math.min(rate, 1))
  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="absolute inset-0"
    >
      {/* Background track */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={RING_STROKE}
        opacity={0.3}
      />
      {/* Progress arc */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke={isPerfect ? 'var(--color-done)' : 'var(--color-primary-400)'}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        className="transition-all duration-500"
      />
    </svg>
  )
}

/**
 * Tiny horizontal bar per area. Past/today: opacity reflects completion rate.
 * Future: full opacity (no completion data yet).
 */
function AreaBar({ area, isFuture }: { area: AreaDayInfo; isFuture: boolean }) {
  const opacity = isFuture ? 1 : area.total > 0 ? 0.3 + 0.7 * (area.done / area.total) : 0.3
  return <div className="h-1.5 w-2.5 rounded-sm" style={{ backgroundColor: area.color, opacity }} />
}

/** Max tasks to show inline in a month cell (3rd hidden on mobile) */
const MAX_VISIBLE_TASKS = 3

/**
 * Compact task preview list for a month cell.
 * Shows up to MAX_VISIBLE_TASKS task names with area color dots, then "+N개".
 */
function TaskPreviewList({
  tasks,
  isDone,
}: {
  tasks: MonthTaskPreview[]
  isDone: (taskId: string) => boolean
}) {
  const visible = tasks.slice(0, MAX_VISIBLE_TASKS)
  const remaining = tasks.length - MAX_VISIBLE_TASKS

  return (
    <div className="mt-0.5 flex w-full flex-col gap-px px-0.5">
      {visible.map((task, i) => {
        const done = isDone(task.id)
        // 3rd task hidden on mobile, visible on desktop
        const hiddenOnMobile = i === MAX_VISIBLE_TASKS - 1
        return (
          <div
            key={task.id}
            className={cn(
              'flex min-w-0 items-center gap-0.5',
              done && 'opacity-50',
              hiddenOnMobile && 'hidden lg:flex'
            )}
          >
            {/* Area color dot */}
            <span
              className="h-1 w-1 shrink-0 rounded-full lg:h-1.5 lg:w-1.5"
              style={{ backgroundColor: task.areaColor ?? 'var(--color-text-disabled)' }}
            />
            {/* Repeat indicator on desktop */}
            {task.repeatType && task.repeatType !== 'once' && (
              <span className="hidden text-[7px] leading-none text-[var(--color-text-disabled)] lg:inline">
                ↻
              </span>
            )}
            <span
              className={cn(
                'truncate text-[9px] leading-tight text-[var(--color-text-secondary)] lg:text-[10px]',
                done && 'line-through'
              )}
            >
              {task.name}
            </span>
          </div>
        )
      })}
      {remaining > 0 && (
        <span className="pl-1.5 text-[8px] leading-tight text-[var(--color-text-tertiary)]">
          +{remaining}개
        </span>
      )}
    </div>
  )
}

/**
 * Monthly calendar — SVG progress rings for past days, task name previews for context.
 */
export function UnifiedCalendar() {
  const { currentDate, setCurrentDate } = useHomeState()
  const { summary, taskPreviews } = useMonthSummary(currentDate)

  const allDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const days: Date[] = []
    let day = calendarStart
    while (day <= calendarEnd) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentDate])

  return (
    <div className="rounded-2xl border border-[var(--color-border)]/40 bg-[var(--color-bg-primary)] p-4">
      {/* Weekday headers — today's weekday highlighted like week view */}
      <div className="mb-2 grid grid-cols-7">
        {WEEKDAYS.map((day, i) => {
          const todayIdx = new Date().getDay() // 0=Sun
          return (
            <div
              key={day}
              className={cn(
                'py-1 text-center text-xs font-medium',
                i === todayIdx
                  ? 'text-[var(--color-primary-500)]'
                  : 'text-[var(--color-text-tertiary)]'
              )}
            >
              {day}
            </div>
          )
        })}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {allDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isSelected = isSameDay(day, currentDate)
          const isDayToday = isToday(day)
          const dayIsFuture = isFuture(day)
          const daySummary: MonthDaySummary | undefined = summary[dateKey]
          const hasTasks = daySummary && daySummary.total > 0

          // Completion rate (only meaningful for past/today)
          const completionRate = hasTasks && !dayIsFuture ? daySummary.done / daySummary.total : 0
          const isPerfect = completionRate === 1 && hasTasks

          return (
            <button
              key={dateKey}
              onClick={() => setCurrentDate(day)}
              className={cn(
                'flex flex-col items-center rounded-lg py-1.5 transition-all',
                'hover:scale-[1.04] hover:bg-[var(--color-bg-tertiary)]',
                'min-h-[72px] min-w-[44px] lg:min-h-[88px]',
                !isCurrentMonth && 'opacity-30',
                isPerfect && 'bg-[var(--color-done)]/8',
                isSelected && !isPerfect && 'bg-[var(--color-primary-50)]',
                isSelected && 'ring-2 ring-[var(--color-primary-500)] ring-inset'
              )}
              aria-label={format(day, 'M월 d일')}
              aria-current={isDayToday ? 'date' : undefined}
              aria-pressed={isSelected}
            >
              {/* Day number with optional progress ring */}
              <div
                className="relative flex items-center justify-center"
                style={{ width: RING_SIZE, height: RING_SIZE }}
              >
                {/* SVG progress ring (past/today with tasks) */}
                {hasTasks && !dayIsFuture && completionRate > 0 && (
                  <ProgressRing rate={completionRate} isPerfect={isPerfect} />
                )}
                <span
                  className={cn(
                    'relative z-[1] text-xs lg:text-sm',
                    isDayToday &&
                      'flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary-500)] font-bold text-white',
                    isSelected && !isDayToday && 'font-bold text-[var(--color-primary-600)]',
                    !isDayToday && !isSelected && 'text-[var(--color-text-primary)]'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Task previews or area bars fallback */}
              {hasTasks &&
                (() => {
                  const dayTasks = taskPreviews[dateKey]
                  if (dayTasks && dayTasks.length > 0) {
                    return (
                      <TaskPreviewList
                        tasks={dayTasks}
                        isDone={(taskId) => dayTasks.find((t) => t.id === taskId)?.isDone ?? false}
                      />
                    )
                  }
                  // Fallback: area bars + count
                  return (
                    <div className="mt-0.5 flex flex-col items-center gap-0.5">
                      {daySummary.areas.length > 0 && (
                        <div className="flex items-center gap-0.5">
                          {daySummary.areas.map((area, i) => (
                            <AreaBar key={i} area={area} isFuture={dayIsFuture} />
                          ))}
                        </div>
                      )}
                      <span className={cn(
                        'text-[9px] leading-none tabular-nums lg:text-[10px]',
                        !dayIsFuture && daySummary.done === daySummary.total
                          ? 'font-medium text-[var(--color-done)]'
                          : 'text-[var(--color-text-disabled)]'
                      )}>
                        {dayIsFuture ? daySummary.total : `${daySummary.done}/${daySummary.total}`}
                      </span>
                    </div>
                  )
                })()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
