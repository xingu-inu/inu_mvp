'use client'

import { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { format, addDays, subDays, isBefore, isSameDay, isToday, startOfToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useHomeState } from '../hooks/use-home-state'
import { useWeekTasks } from '../hooks/use-week-tasks'
import { useTaskLayout, assignGoogleEventsToSlots } from '../hooks/use-task-layout'
import { useGoogleCalendarEvents } from '@/queries/use-google-calendar-events'
import { useHomeStore } from '@/stores/home.store'
import { useHomeDirection } from '../hooks/use-home-direction'
import { mapApiTasksToEntities } from '@/lib/utils/task-utils'
import { TIME_SLOT_CONFIG, DISPLAY_SLOTS, getCurrentSlot } from '@/lib/constants/time-slots'
import { SlotBlock } from './slot-block'
import { SlotTaskRow } from './slot-task-row'
import { SlotGoogleEventRow } from './slot-google-event-row'
import type { HomeTask } from '@/types/entities'
import type { GoogleCalendarEvent } from '@/types/google-calendar'
import type { SlotGoogleEvents } from '../hooks/use-task-layout'

const GUTTER_PX = 56
const GUTTER_PX_MOBILE = 40
const MOBILE_MAX_VISIBLE = 2

/** Check if a slot is strictly before the current slot (for past-slot dimming on today) */
function isSlotPast(slot: string, currentSlot: string): boolean {
  const order = ['dawn', 'morning', 'afternoon', 'evening']
  return order.indexOf(slot) < order.indexOf(currentSlot)
}

/**
 * Week view — 4-block time-slot layout with tasks as simple list rows.
 * Desktop: 7-day full week. Mobile: 3-day sliding window.
 */
export function WeekViewGrid() {
  const { currentDate, setCurrentDate, title } = useHomeState()
  const { selectedDirectionId } = useHomeDirection()
  const { tasksByDate, weekDays, isLoading } = useWeekTasks(
    currentDate,
    selectedDirectionId ?? undefined
  )
  const setHighlightedTaskId = useHomeStore((s) => s.setHighlightedTaskId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  // Responsive grid dimensions
  const gutterPx = isMobile ? GUTTER_PX_MOBILE : GUTTER_PX

  // Visible days: mobile shows 3 days centered on currentDate, desktop shows all 7
  const visibleDays = useMemo(() => {
    if (!isMobile) return weekDays
    const idx = weekDays.findIndex((d) => isSameDay(d, currentDate))
    if (idx === -1) return weekDays.slice(0, 3)
    const start = Math.max(0, Math.min(idx - 1, weekDays.length - 3))
    return weekDays.slice(start, start + 3)
  }, [isMobile, weekDays, currentDate])

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

  // Anytime row: check visible days for anytime tasks or all-day events
  const hasAnyAnytime = visibleDays.some((day) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return (layoutByDate[dateStr]?.anytime ?? []).length > 0
  })
  const hasAnyAllDay = visibleDays.some((day) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return (googleSlotsByDate[dateStr]?.allDay ?? []).length > 0
  })
  const showAnytimeRow = hasAnyAnytime || hasAnyAllDay

  const hasAnyTasks = useMemo(
    () => Object.values(entityTasksByDate).some((tasks) => tasks.length > 0),
    [entityTasksByDate]
  )

  const gridColumns = `${gutterPx}px repeat(${visibleDays.length}, minmax(0, 1fr))`

  const gridBodyRef = useRef<HTMLDivElement>(null)

  // Check if dawn has any content across visible days
  const dawnHasContent = useMemo(() => {
    return visibleDays.some((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const tasks = layoutByDate[dateStr]?.dawn ?? []
      const events = googleSlotsByDate[dateStr]?.dawn ?? []
      return tasks.length > 0 || events.length > 0
    })
  }, [visibleDays, layoutByDate, googleSlotsByDate])

  // Dawn collapsed = no content in dawn slot across visible days
  const dawnCollapsed = !dawnHasContent

  const handleTaskClick = useCallback(
    (taskId: string | null, d: Date) => {
      setCurrentDate(d)
      setHighlightedTaskId(taskId)
    },
    [setCurrentDate, setHighlightedTaskId]
  )

  // Mobile navigation: shift 3 days
  const goBack3Days = useCallback(() => {
    setCurrentDate(subDays(currentDate, 3))
  }, [currentDate, setCurrentDate])

  const goForward3Days = useCallback(() => {
    setCurrentDate(addDays(currentDate, 3))
  }, [currentDate, setCurrentDate])

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
    <div
      className="overflow-hidden rounded-t-2xl border-x border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-[var(--shadow-card)] lg:flex lg:h-full lg:flex-col"
      style={
        isMobile
          ? ({
              '--chip-h': '26px',
              '--chip-py': '4px',
              '--chip-font-size': '11px',
              '--chip-line-height': '1.3',
              '--chip-time-font-size': '9px',
              '--chip-time-color': 'var(--color-text-disabled)',
              '--chip-radius': '6px',
            } as React.CSSProperties)
          : undefined
      }
    >
      {/* ── Mobile nav row ── */}
      {isMobile && (
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-1 py-1">
          <button
            type="button"
            onClick={goBack3Days}
            className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-bg-tertiary)]"
            aria-label="이전 3일"
          >
            <ChevronLeft className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          </button>
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{title}</span>
          <button
            type="button"
            onClick={goForward3Days}
            className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-bg-tertiary)]"
            aria-label="다음 3일"
          >
            <ChevronRight className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          </button>
        </div>
      )}

      <div ref={scrollRef} className="overflow-auto lg:min-h-0 lg:flex-1">
        <div className={cn('flex h-full flex-col', !isMobile && 'min-w-[840px]')}>
          {/* ── Sticky day headers ── */}
          <div className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
              <div className="sticky left-0 z-30 bg-[var(--color-bg-primary)] p-2" />
              {visibleDays.map((day) => {
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
                const isDawnEmpty = slot === 'dawn' && dawnCollapsed

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
                      flex: isDawnEmpty ? '0 0 32px' : '1 1 0',
                      minHeight: '40px',
                      transition: 'flex-grow 200ms ease-out, flex-basis 200ms ease-out',
                    }}
                  >
                    <span
                      className={cn(
                        'text-center leading-tight text-[var(--color-text-disabled)]',
                        isMobile ? 'text-xs' : 'text-sm'
                      )}
                    >
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

            {/* Day columns — each with 4 SlotBlocks */}
            {visibleDays.map((day) => {
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
                        dawnCollapsed={dawnCollapsed}
                        maxVisible={isMobile ? MOBILE_MAX_VISIBLE : undefined}
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
          <div className={cn(!isMobile && 'min-w-[840px]')}>
            <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
              <div className="sticky left-0 z-10 flex items-center justify-center bg-[var(--color-bg-secondary)]/60 px-1 py-2">
                <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                  종일
                </span>
              </div>
              {visibleDays.map((day) => {
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
