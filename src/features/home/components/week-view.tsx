'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import { format, isSameDay, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useHomeState } from '../hooks/use-home-state'
import { useWeekTasks } from '../hooks/use-week-tasks'
import { useTaskLayout } from '../hooks/use-task-layout'
import { useHomeStore } from '@/stores/home.store'
import { mapApiTasksToEntities } from '@/lib/utils/task-utils'
import { WeekDayColumn } from './week-day-column'
import { WeekTaskBlock } from './week-task-block'
import {
  HOUR_HEIGHT,
  HOUR_LABELS,
  TOTAL_GRID_HEIGHT,
  GUTTER_WIDTH,
} from '@/lib/constants/time-slots'
import type { HomeTask } from '@/types/entities'

/**
 * Week view — Google Calendar-style 24-hour grid with task blocks.
 */
export function WeekViewGrid() {
  const { currentDate, setCurrentDate } = useHomeState()
  const { tasksByDate, weekDays, isLoading } = useWeekTasks(currentDate)
  const setHighlightedTaskId = useHomeStore((s) => s.setHighlightedTaskId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const gridBodyRef = useRef<HTMLDivElement>(null)

  // Map API tasks to entities for each day
  const entityTasksByDate = useMemo(() => {
    const result: Record<string, HomeTask[]> = {}
    for (const [dateStr, tasks] of Object.entries(tasksByDate)) {
      result[dateStr] = mapApiTasksToEntities(tasks)
    }
    return result
  }, [tasksByDate])

  // Compute positioned layouts for all days
  const layoutByDate = useTaskLayout(entityTasksByDate)

  // Fill remaining viewport height + auto-scroll to current time
  useEffect(() => {
    const el = scrollRef.current
    if (!el || isLoading) return

    // 1. Measure distance from grid body top to viewport top → set CSS var
    const measure = () => {
      const { top } = el.getBoundingClientRect()
      el.style.setProperty('--grid-top', `${top}px`)
    }
    measure()

    // 2. Auto-scroll to current time (account for sticky header offset)
    requestAnimationFrame(() => {
      const now = new Date()
      const minutes = now.getHours() * 60 + now.getMinutes()
      const timePx = (minutes / 60) * HOUR_HEIGHT
      const headerOffset = gridBodyRef.current?.offsetTop ?? 0
      const viewH = el.clientHeight
      el.scrollTo({ top: Math.max(0, headerOffset + timePx - viewH / 3), behavior: 'instant' })
    })

    // 3. Re-measure on resize
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isLoading])

  // Anytime row: check if any and compute summary for collapsed state
  const hasAnyAnytime = Object.values(layoutByDate).some((dl) => dl.anytime.length > 0)
  const totalAnytime = useMemo(() => {
    const selectedDateStr = format(currentDate, 'yyyy-MM-dd')
    const dayAnytime = layoutByDate[selectedDateStr]?.anytime ?? []
    return dayAnytime.length
  }, [layoutByDate, currentDate])

  // Auto-collapse if >4 anytime tasks, user can toggle
  const [anytimeExpanded, setAnytimeExpanded] = useState(false)
  const showAnytimeCollapsed = hasAnyAnytime && totalAnytime > 4 && !anytimeExpanded

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
        ))}
      </div>
    )
  }

  const hasAnyTasks = Object.values(entityTasksByDate).some((tasks) => tasks.length > 0)

  return (
    <div className="overflow-hidden rounded-t-2xl border-x border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-[var(--shadow-card)] lg:flex lg:h-full lg:flex-col">
      {/* Single scroll container — header + grid share the same scroll so columns always align */}
      <div
        ref={scrollRef}
        className="overflow-auto lg:min-h-0 lg:flex-1"
        style={{ height: 'calc(100dvh - var(--grid-top, 200px))' }}
      >
        <div className="min-w-[840px]">
          {/* Sticky day headers */}
          <div className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div
              className="grid"
              style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(7, 1fr)` }}
            >
              <div className="sticky left-0 z-30 bg-[var(--color-bg-primary)] p-2" />
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const isSelected = isSameDay(day, currentDate)
                const isDayToday = isToday(day)
                const dayTasks = entityTasksByDate[dateStr] ?? []

                // Mini completion dots (max 5)
                const statusDots = dayTasks.slice(0, 5).map((t) => t.todayCheckIn?.status ?? null)

                return (
                  <button
                    key={dateStr}
                    onClick={() => setCurrentDate(day)}
                    className={cn(
                      'flex flex-col items-center px-1 py-2.5 text-center transition-colors',
                      'hover:bg-[var(--color-bg-tertiary)]',
                      isSelected && !isDayToday && 'bg-[var(--color-primary-50)]'
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs font-medium tracking-wide',
                        isDayToday
                          ? 'text-[var(--color-primary-500)]'
                          : 'text-[var(--color-text-tertiary)]'
                      )}
                    >
                      {format(day, 'EEE', { locale: ko })}
                    </span>
                    <span
                      className={cn(
                        'mt-1 flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium',
                        isDayToday && 'bg-[var(--color-primary-500)] text-white',
                        isSelected &&
                          !isDayToday &&
                          'bg-[var(--color-primary-100)] text-[var(--color-primary-600)]',
                        !isDayToday && !isSelected && 'text-[var(--color-text-primary)]'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {/* Mini completion dots */}
                    {statusDots.length > 0 && (
                      <div className="mt-1 flex items-center gap-0.5">
                        {statusDots.map((s, i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-1 w-1 rounded-full',
                              s === 'done' && 'bg-[var(--color-done)]',
                              s === 'skip' && 'bg-[var(--color-skip)]',
                              !s && 'bg-[var(--color-border)]'
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* All-day (anytime) row — collapsible when >4 tasks */}
            {hasAnyAnytime && showAnytimeCollapsed && (
              <button
                onClick={() => setAnytimeExpanded(true)}
                className="flex w-full items-center gap-2 border-t border-[var(--color-border)] px-3 py-2 text-left transition-colors hover:bg-[var(--color-bg-tertiary)]"
              >
                <span className="text-xs text-[var(--color-text-disabled)]">종일</span>
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {totalAnytime}개
                </span>
                {/* Mini dots for selected day's completion */}
                {(() => {
                  const dateStr = format(currentDate, 'yyyy-MM-dd')
                  const anytimeTasks = layoutByDate[dateStr]?.anytime ?? []
                  const doneCount = anytimeTasks.filter(
                    (t) => t.todayCheckIn?.status === 'done'
                  ).length
                  return doneCount > 0 ? (
                    <span className="text-xs text-[var(--color-done)]">{doneCount}완료</span>
                  ) : null
                })()}
                <span className="ml-auto text-[10px] text-[var(--color-text-disabled)]">
                  펼치기 ▾
                </span>
              </button>
            )}
            {hasAnyAnytime && !showAnytimeCollapsed && (
              <div className="border-t border-[var(--color-border)]">
                {totalAnytime > 4 && (
                  <button
                    onClick={() => setAnytimeExpanded(false)}
                    className="flex w-full items-center justify-between px-3 py-1 text-[10px] text-[var(--color-text-disabled)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
                  >
                    <span>종일 {totalAnytime}개</span>
                    <span>접기 ▴</span>
                  </button>
                )}
                <div
                  className="grid"
                  style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(7, 1fr)` }}
                >
                  <div className="sticky left-0 z-10 flex items-center justify-center bg-[var(--color-bg-primary)] px-1 py-1.5">
                    {totalAnytime <= 4 && (
                      <span className="text-xs text-[var(--color-text-disabled)]">종일</span>
                    )}
                  </div>
                  {weekDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const anytimeTasks = layoutByDate[dateStr]?.anytime ?? []

                    return (
                      <div
                        key={dateStr}
                        className="flex min-w-0 flex-col gap-0.5 border-l border-[var(--color-border)] px-0.5 py-1"
                      >
                        {anytimeTasks.slice(0, 2).map((task) => (
                          <WeekTaskBlock
                            key={task.id}
                            task={task}
                            onClick={() => {
                              setCurrentDate(day)
                              setHighlightedTaskId(task.id)
                            }}
                          />
                        ))}
                        {anytimeTasks.length > 2 && (
                          <button
                            onClick={() => setCurrentDate(day)}
                            className="w-full rounded-md px-1 py-0.5 text-xs text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)]"
                          >
                            +{anytimeTasks.length - 2}개 더보기
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 24-hour grid body */}
          <div
            ref={gridBodyRef}
            className="grid"
            style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(7, 1fr)` }}
          >
            {/* Time gutter (24 hour labels) — Google Calendar style */}
            <div
              className="sticky left-0 z-10 bg-[var(--color-bg-primary)]"
              style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
            >
              {HOUR_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="absolute right-0 pr-2"
                  style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                >
                  {/* Skip 0시 label (sits at very top edge) */}
                  {i > 0 && (
                    <span className="relative -top-[9px] text-[11px] leading-none text-[var(--color-text-disabled)]">
                      {label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayLayout = layoutByDate[dateStr]
              return (
                <WeekDayColumn
                  key={dateStr}
                  day={day}
                  currentDate={currentDate}
                  isToday={isToday(day)}
                  positioned={dayLayout?.positioned ?? []}
                  onTaskClick={(taskId, d) => {
                    setCurrentDate(d)
                    setHighlightedTaskId(taskId)
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!hasAnyTasks && (
        <div className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">
          이번 주에 예정된 할 일이 없어요
        </div>
      )}
    </div>
  )
}
