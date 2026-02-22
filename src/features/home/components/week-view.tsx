'use client'

import { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { format, isBefore, isSameDay, isToday, startOfToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useHomeState } from '../hooks/use-home-state'
import { useWeekTasks } from '../hooks/use-week-tasks'
import { useTaskLayout, assignGoogleEventsToSlots } from '../hooks/use-task-layout'
import { useGoogleCalendarEvents } from '@/queries/use-google-calendar-events'
import { useHomeStore } from '@/stores/home.store'
import { mapApiTasksToEntities } from '@/lib/utils/task-utils'
import {
  TIME_SLOT_CONFIG,
  DISPLAY_SLOTS,
  getCurrentSlot,
  SLOT_DAWN_COLLAPSED_HEIGHT,
} from '@/lib/constants/time-slots'
import { SlotBlock } from './slot-block'
import { SlotTaskRow } from './slot-task-row'
import { SlotGoogleEventRow } from './slot-google-event-row'
import type { HomeTask } from '@/types/entities'
import type { GoogleCalendarEvent } from '@/types/google-calendar'
import type { SlotGoogleEvents } from '../hooks/use-task-layout'

const GUTTER_PX = 56

/** Check if a slot is strictly before the current slot (for past-slot dimming on today) */
function isSlotPast(slot: string, currentSlot: string): boolean {
  const order = ['dawn', 'morning', 'afternoon', 'evening']
  return order.indexOf(slot) < order.indexOf(currentSlot)
}

/**
 * Week view — 4-block time-slot layout with tasks as simple list rows.
 */
export function WeekViewGrid() {
  const { currentDate, setCurrentDate } = useHomeState()
  const { tasksByDate, weekDays, isLoading } = useWeekTasks(currentDate)
  const setHighlightedTaskId = useHomeStore((s) => s.setHighlightedTaskId)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Map API tasks to entities for each day
  const entityTasksByDate = useMemo(() => {
    const result: Record<string, HomeTask[]> = {}
    for (const [dateStr, tasks] of Object.entries(tasksByDate)) {
      result[dateStr] = mapApiTasksToEntities(tasks)
    }
    return result
  }, [tasksByDate])

  // Compute slot-based layouts for all days
  const layoutByDate = useTaskLayout(entityTasksByDate)

  // Google Calendar events
  const weekStartStr = format(weekDays[0] ?? new Date(), 'yyyy-MM-dd')
  const { data: googleEvents = [] } = useGoogleCalendarEvents(weekStartStr)

  // Group Google events by date, then bucket into slots
  const googleSlotsByDate = useMemo(() => {
    const byDate: Record<string, GoogleCalendarEvent[]> = {}
    for (const event of googleEvents) {
      const dateStr = event.dateStr
      if (!byDate[dateStr]) byDate[dateStr] = []
      byDate[dateStr].push(event)
    }

    const result: Record<string, SlotGoogleEvents> = {}
    for (const [dateStr, events] of Object.entries(byDate)) {
      result[dateStr] = assignGoogleEventsToSlots(events)
    }
    return result
  }, [googleEvents])

  // Current slot + progress tracking (updates every minute)
  const [currentSlot, setCurrentSlot] = useState(getCurrentSlot)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlot(getCurrentSlot())
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Measure distance from grid top to viewport for height calc
  useEffect(() => {
    const el = scrollRef.current
    if (!el || isLoading) return

    const measure = () => {
      const { top } = el.getBoundingClientRect()
      el.style.setProperty('--grid-top', `${top}px`)
    }
    measure()

    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isLoading])

  // Anytime row: check if any day has anytime tasks or all-day events
  const hasAnyAnytime = Object.values(layoutByDate).some((sl) => sl.anytime.length > 0)
  const hasAnyAllDay = Object.values(googleSlotsByDate).some((gs) => gs.allDay.length > 0)
  const showAnytimeRow = hasAnyAnytime || hasAnyAllDay

  const hasAnyTasks = useMemo(
    () => Object.values(entityTasksByDate).some((tasks) => tasks.length > 0),
    [entityTasksByDate]
  )
  const gridColumns = `${GUTTER_PX}px repeat(7, minmax(0, 1fr))`

  // ── Slot height calculation ──
  const gridBodyRef = useRef<HTMLDivElement>(null)
  const [gridBodyHeight, setGridBodyHeight] = useState(0)

  useEffect(() => {
    const el = gridBodyRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = Math.round(entry.contentRect.height)
        setGridBodyHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev))
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Check if dawn has any content across the week
  const dawnHasContent = useMemo(() => {
    return weekDays.some((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const tasks = layoutByDate[dateStr]?.dawn ?? []
      const events = googleSlotsByDate[dateStr]?.dawn ?? []
      return tasks.length > 0 || events.length > 0
    })
  }, [weekDays, layoutByDate, googleSlotsByDate])

  // Compute per-slot heights: dawn gets collapsed height when empty, rest split equally
  const slotHeights = useMemo(() => {
    if (gridBodyHeight <= 0) return null // Not measured yet, let CSS handle it
    if (dawnHasContent) {
      // All 4 slots equal
      const h = Math.floor(gridBodyHeight / 4)
      return { dawn: h, morning: h, afternoon: h, evening: h }
    }
    // Dawn collapsed, rest split remaining space
    const remaining = gridBodyHeight - SLOT_DAWN_COLLAPSED_HEIGHT
    const h = Math.floor(remaining / 3)
    return { dawn: SLOT_DAWN_COLLAPSED_HEIGHT, morning: h, afternoon: h, evening: h }
  }, [gridBodyHeight, dawnHasContent])

  const handleTaskClick = useCallback(
    (taskId: string | null, d: Date) => {
      setCurrentDate(d)
      setHighlightedTaskId(taskId)
    },
    [setCurrentDate, setHighlightedTaskId]
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-t-2xl border-x border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-[var(--shadow-card)] lg:flex lg:h-full lg:flex-col">
      <div
        ref={scrollRef}
        className="overflow-auto lg:min-h-0 lg:flex-1"
        style={{ height: 'calc(100dvh - var(--grid-top, 200px))' }}
      >
        <div className="flex h-full min-w-[840px] flex-col">
          {/* ── Sticky day headers ── */}
          <div className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
              <div className="sticky left-0 z-30 bg-[var(--color-bg-primary)] p-2" />
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const isSelected = isSameDay(day, currentDate)
                const isDayToday = isToday(day)
                const dayTasks = entityTasksByDate[dateStr] ?? []
                const isDayPast = isBefore(day, startOfToday())
                const doneCount = dayTasks.filter((t) => t.todayCheckIn?.status === 'done').length
                const skipCount = dayTasks.filter((t) => t.todayCheckIn?.status === 'skip').length
                const totalCount = dayTasks.length

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
                    {totalCount > 0 && (
                      <div className="mt-1.5 flex flex-col items-center gap-1">
                        {/* Segmented progress bar */}
                        <div className="flex h-[3px] w-6 overflow-hidden rounded-full bg-[var(--color-border)]">
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
                        {isDayPast && (
                          <span className="text-[10px] text-[var(--color-text-disabled)] tabular-nums">
                            {doneCount}/{totalCount}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── 4-Block grid body ── */}
          <div
            ref={gridBodyRef}
            className="grid flex-1"
            style={{ gridTemplateColumns: gridColumns }}
          >
            {/* Slot labels gutter */}
            <div className="sticky left-0 z-10 flex flex-col bg-[var(--color-bg-primary)]">
              {DISPLAY_SLOTS.map((slot) => {
                const config = TIME_SLOT_CONFIG[slot]
                const isDawnEmpty = slot === 'dawn' && !dawnHasContent
                const gutterHeight = slotHeights?.[slot]

                return (
                  <div
                    key={slot}
                    className={cn(
                      'flex flex-col items-center justify-center gap-0.5 border-b border-[var(--color-border)]/50 px-1',
                      currentSlot === slot && 'bg-[var(--color-primary-50)]/40',
                      isDawnEmpty && 'opacity-50'
                    )}
                    style={{
                      ...(currentSlot !== slot
                        ? { backgroundColor: `var(--color-slot-${slot})` }
                        : {}),
                      ...(gutterHeight ? { height: `${gutterHeight}px` } : { minHeight: '40px' }),
                      transition: 'height 200ms ease-out, min-height 200ms ease-out',
                    }}
                  >
                    <span className="text-center text-sm leading-tight text-[var(--color-text-disabled)]">
                      {config.emoji}
                    </span>
                    {/* Hide hour range text when dawn is collapsed to save space */}
                    {!isDawnEmpty && (
                      <span
                        className={cn(
                          'text-[9px] leading-none',
                          currentSlot === slot
                            ? 'text-[var(--color-primary-500)]'
                            : 'text-[var(--color-text-disabled)]'
                        )}
                      >
                        {config.hours[0]}-{config.hours[1]}
                      </span>
                    )}
                    {/* "Now" indicator for current slot */}
                    {currentSlot === slot && (
                      <span className="mt-0.5 text-[8px] leading-none font-semibold text-[var(--color-primary-500)]">
                        지금
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 7 day columns — each with 4 SlotBlocks */}
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const slotLayout = layoutByDate[dateStr]
              const slotGoogle = googleSlotsByDate[dateStr]
              const dayIsToday = isToday(day)
              const dayIsPast = isBefore(day, startOfToday())

              return (
                <div
                  key={dateStr}
                  className={cn(
                    'flex min-w-0 flex-col overflow-hidden border-l border-[var(--color-border)]/50',
                    dayIsToday && 'bg-[var(--color-primary-50)]/20'
                  )}
                >
                  {DISPLAY_SLOTS.map((slot) => {
                    const slotIsPast = dayIsToday && isSlotPast(slot, currentSlot)
                    return (
                      <SlotBlock
                        key={slot}
                        slot={slot}
                        tasks={slotLayout?.[slot] ?? []}
                        googleEvents={slotGoogle?.[slot] ?? []}
                        isNow={dayIsToday && currentSlot === slot}
                        isToday={dayIsToday}
                        isPast={dayIsPast}
                        isPastSlot={slotIsPast}
                        day={day}
                        slotHeight={slotHeights?.[slot]}
                        onTaskClick={handleTaskClick}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Anytime row (fixed at bottom, outside scroll area) ── */}
      {showAnytimeRow && (
        <div className="flex-shrink-0 overflow-x-auto border-t-2 border-[var(--color-border)] bg-[var(--color-bg-secondary)]/60">
          <div className="min-w-[840px]">
            <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
              <div className="sticky left-0 z-10 flex items-center justify-center bg-[var(--color-bg-secondary)]/60 px-1 py-2">
                <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                  종일
                </span>
              </div>
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const anytimeTasks = layoutByDate[dateStr]?.anytime ?? []
                const allDayEvents = googleSlotsByDate[dateStr]?.allDay ?? []
                const isDayPast = isBefore(day, startOfToday())

                return (
                  <div
                    key={dateStr}
                    className="flex min-w-0 flex-col gap-0.5 overflow-y-auto border-l border-[var(--color-border)]/50 px-0.5 py-1"
                    style={{ maxHeight: `${4 * 28}px` }}
                  >
                    {anytimeTasks.map((task) => (
                      <SlotTaskRow
                        key={task.id}
                        task={task}
                        isPast={isDayPast}
                        onClick={() => {
                          setCurrentDate(day)
                          setHighlightedTaskId(task.id)
                        }}
                      />
                    ))}
                    {allDayEvents.map((event) => (
                      <SlotGoogleEventRow key={event.id} event={event} />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAnyTasks && (
        <div className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">
          이번 주에 예정된 할 일이 없어요
        </div>
      )}
    </div>
  )
}
