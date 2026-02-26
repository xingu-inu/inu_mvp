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
import { useAreas } from '@/queries/use-areas'
import {
  useMonthSummary,
  type MonthDaySummary,
  type MonthSummaryData,
  type MonthTaskPreview,
} from '../hooks/use-month-summary'
import { CalendarSkeleton } from './calendar-skeleton'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// SVG progress ring constants
const RING_SIZE = 32
const RING_RADIUS = 13
const RING_STROKE = 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

/** Max dots to show per cell before truncating */
const MAX_VISIBLE_DOTS = 12

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
 * Renders area-colored dots for each task in a day cell.
 * Done = filled saturated, Skip = gray, Miss = faded, Future = outlined.
 */
function DotGarden({
  tasks,
  isFuture: dayIsFuture,
}: {
  tasks: MonthTaskPreview[]
  isFuture: boolean
}) {
  const visible = tasks.slice(0, MAX_VISIBLE_DOTS)
  const overflow = tasks.length - MAX_VISIBLE_DOTS

  return (
    <div className="mt-1 flex flex-wrap items-start justify-center gap-0.5 px-1">
      {visible.map((task, i) => {
        const color = task.areaColor ?? 'var(--color-text-disabled)'

        if (dayIsFuture) {
          // Future: outlined dot
          return (
            <span
              key={task.id}
              className="animate-dot-grow h-[5px] w-[5px] rounded-full border lg:h-1.5 lg:w-1.5"
              style={{
                borderColor: color,
                opacity: 0.4,
                animationDelay: `${i * 15}ms`,
              }}
              aria-label={`${task.name}: 예정`}
            />
          )
        }

        // Past/today dots
        const isDone = task.isDone
        const isSkip = task.isSkip
        const bgColor = isSkip ? 'var(--color-skip)' : color
        const opacity = isDone ? 1 : isSkip ? 0.7 : 0.2

        return (
          <span
            key={task.id}
            className="animate-dot-grow h-[5px] w-[5px] rounded-full lg:h-1.5 lg:w-1.5"
            style={{
              backgroundColor: bgColor,
              opacity,
              animationDelay: `${i * 15}ms`,
            }}
            aria-label={`${task.name}: ${isDone ? '완료' : isSkip ? '건너뜀' : '미완료'}`}
          />
        )
      })}
      {overflow > 0 && (
        <span className="text-[7px] leading-none text-[var(--color-text-disabled)] lg:text-[8px]">
          +{overflow}
        </span>
      )}
    </div>
  )
}

/**
 * Compact monthly summary bar: completion rate, perfect days, area breakdown.
 */
function MonthSummaryHeader({
  summary,
  areas,
}: {
  summary: MonthSummaryData
  areas: { emoji: string; color: string; id: string }[] | undefined
}) {
  const stats = useMemo(() => {
    let totalTasks = 0
    let totalDone = 0
    let perfectDays = 0
    const areaTaskCount: Record<string, number> = {}

    const todayStr = format(new Date(), 'yyyy-MM-dd')
    for (const [dateKey, day] of Object.entries(summary)) {
      if (dateKey > todayStr || day.total === 0) continue
      totalTasks += day.total
      totalDone += day.done
      if (day.done === day.total) perfectDays++
      for (const area of day.areas) {
        // Use color as key since we don't have area id in summary
        areaTaskCount[area.color] = (areaTaskCount[area.color] ?? 0) + area.done
      }
    }

    const completionRate = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0

    // Map area colors → emoji for top 3
    const areaEmojiMap: Record<string, string> = {}
    if (areas) {
      for (const a of areas) {
        areaEmojiMap[a.color] = a.emoji
      }
    }
    const topAreas = Object.entries(areaTaskCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([color, count]) => ({
        emoji: areaEmojiMap[color] ?? '📌',
        count,
        color,
      }))

    return { completionRate, totalDone, totalTasks, perfectDays, topAreas }
  }, [summary, areas])

  if (stats.totalTasks === 0) return null

  return (
    <div className="mb-3 flex items-center justify-center gap-2 text-xs text-[var(--color-text-secondary)]">
      <span className="font-medium">
        <span
          className={
            stats.completionRate >= 80
              ? 'text-[var(--color-done)]'
              : 'text-[var(--color-primary-500)]'
          }
        >
          {stats.completionRate}%
        </span>{' '}
        완료
      </span>

      {stats.perfectDays > 0 && (
        <>
          <span className="text-[var(--color-border)]">·</span>
          <span>
            <span className="text-[var(--color-done)]">{stats.perfectDays}</span>일 올클리어
          </span>
        </>
      )}

      {stats.topAreas.length > 0 && (
        <>
          <span className="hidden text-[var(--color-border)] sm:inline">·</span>
          <span className="hidden items-center gap-1.5 sm:flex">
            {stats.topAreas.map((a) => (
              <span key={a.color} className="flex items-center gap-0.5">
                <span className="text-[11px]">{a.emoji}</span>
                <span className="tabular-nums">{a.count}</span>
              </span>
            ))}
          </span>
        </>
      )}
    </div>
  )
}

/**
 * Monthly calendar — Color Dot Garden.
 * Each task is a colored dot (area color). Done=filled, Skip=gray, Miss=faded, Future=outlined.
 */
export function UnifiedCalendar() {
  const { currentDate, setCurrentDate } = useHomeState()
  const { summary, taskPreviews, isLoading } = useMonthSummary(currentDate)
  const { data: areas } = useAreas()

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

  if (isLoading) return <CalendarSkeleton />

  return (
    <div className="rounded-2xl border border-[var(--color-border)]/40 bg-[var(--color-bg-primary)] p-4">
      {/* Weekday headers — today's weekday highlighted */}
      <div className="mb-2 grid grid-cols-7">
        {WEEKDAYS.map((day, i) => {
          const todayIdx = new Date().getDay()
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

      {/* Monthly summary */}
      <MonthSummaryHeader summary={summary} areas={areas} />

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

          const dayTasks = taskPreviews[dateKey]
          const hasDotsToShow = dayTasks && dayTasks.length > 0

          return (
            <button
              key={dateKey}
              onClick={() => setCurrentDate(day)}
              className={cn(
                'flex flex-col items-center rounded-lg py-1.5 transition-all',
                'hover:bg-[var(--color-bg-tertiary)]',
                'min-h-[64px] min-w-[44px] lg:min-h-[76px]',
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

              {/* Color Dot Garden */}
              {hasDotsToShow && <DotGarden tasks={dayTasks} isFuture={dayIsFuture} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
