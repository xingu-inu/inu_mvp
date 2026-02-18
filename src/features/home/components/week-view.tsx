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
import { TIME_SLOT_CONFIG, DISPLAY_SLOTS, getCurrentSlot, ANYTIME_MAX_VISIBLE, ANYTIME_COLLAPSE_THRESHOLD, SLOT_DAWN_COLLAPSED_HEIGHT } from '@/lib/constants/time-slots'
import { motion, AnimatePresence } from 'framer-motion'
import { SlotBlock } from './slot-block'
import { SlotTaskRow } from './slot-task-row'
import { SlotGoogleEventRow } from './slot-google-event-row'
import type { HomeTask } from '@/types/entities'
import type { GoogleCalendarEvent } from '@/types/google-calendar'
import type { SlotGoogleEvents } from '../hooks/use-task-layout'

const GUTTER_PX = 56

/** Check if a slot is before the current slot (for past-slot dimming on today) */
function isSlotCurrent(slot: string, currentSlot: string): boolean {
  const order = ['dawn', 'morning', 'afternoon', 'evening']
  const slotIdx = order.indexOf(slot)
  const currentIdx = order.indexOf(currentSlot)
  // Slot is "past" if it comes before the current slot
  return slotIdx >= currentIdx
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

  // Current slot tracking (updates every minute)
  const [currentSlot, setCurrentSlot] = useState(getCurrentSlot)
  useEffect(() => {
    const interval = setInterval(() => setCurrentSlot(getCurrentSlot()), 60_000)
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

  // Anytime row: week-wide metrics for stable collapse state
  const hasAnyAnytime = Object.values(layoutByDate).some((sl) => sl.anytime.length > 0)
  const hasAnyAllDay = Object.values(googleSlotsByDate).some((gs) => gs.allDay.length > 0)
  const showAnytimeRow = hasAnyAnytime || hasAnyAllDay

  const maxAnytimePerDay = useMemo(
    () =>
      Math.max(
        0,
        ...Object.values(layoutByDate).map((sl) => sl.anytime.length),
        ...Object.values(googleSlotsByDate).map((gs) => gs.allDay.length)
      ),
    [layoutByDate, googleSlotsByDate]
  )
  const totalWeekAnytime = useMemo(
    () =>
      Object.values(layoutByDate).reduce((sum, sl) => sum + sl.anytime.length, 0) +
      Object.values(googleSlotsByDate).reduce((sum, gs) => sum + gs.allDay.length, 0),
    [layoutByDate, googleSlotsByDate]
  )

  // Auto-collapse anytime row if any day exceeds threshold
  const [anytimeExpanded, setAnytimeExpanded] = useState(false)
  const showAnytimeCollapsed = showAnytimeRow && maxAnytimePerDay > ANYTIME_COLLAPSE_THRESHOLD && !anytimeExpanded

  const hasAnyTasks = useMemo(
    () => Object.values(entityTasksByDate).some((tasks) => tasks.length > 0),
    [entityTasksByDate]
  )
  const gridColumns = `${GUTTER_PX}px repeat(7, 1fr)`

  // ── Slot height calculation ──
  const gridBodyRef = useRef<HTMLDivElement>(null)
  const [gridBodyHeight, setGridBodyHeight] = useState(0)

  useEffect(() => {
    const el = gridBodyRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setGridBodyHeight(entry.contentRect.height)
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
        <div className="min-w-[840px]">
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
                          <span className="text-[10px] tabular-nums text-[var(--color-text-disabled)]">
                            {doneCount}/{totalCount}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* ── Anytime row (collapsible) ── */}
            {showAnytimeRow && showAnytimeCollapsed && (
              <div className="border-t border-[var(--color-border)]">
                <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
                  <button
                    onClick={() => setAnytimeExpanded(true)}
                    className="sticky left-0 z-10 flex items-center justify-center bg-[var(--color-bg-primary)] px-1 py-1.5 text-[10px] text-[var(--color-text-disabled)] hover:text-[var(--color-text-tertiary)]"
                  >
                    종일 ▾
                  </button>
                  {weekDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const anytimeTasks = layoutByDate[dateStr]?.anytime ?? []
                    const allDayEvents = googleSlotsByDate[dateStr]?.allDay ?? []
                    const allItems = [...anytimeTasks.map((t) => ({
                      color: t.goal?.area?.color ?? t.directArea?.color ?? '#64748b',
                      isDone: t.todayCheckIn?.status === 'done',
                    })), ...allDayEvents.map(() => ({
                      color: 'var(--color-google-event)',
                      isDone: false,
                    }))]
                    const visibleDots = allItems.slice(0, 6)
                    const overflow = allItems.length - 6

                    return (
                      <button
                        key={dateStr}
                        onClick={() => {
                          setAnytimeExpanded(true)
                          setCurrentDate(day)
                        }}
                        className="flex min-w-0 flex-wrap items-center gap-0.5 border-l border-[var(--color-border)]/50 px-1 py-1.5 transition-colors hover:bg-[var(--color-bg-tertiary)]"
                      >
                        {visibleDots.map((item, i) => (
                          <span
                            key={i}
                            className={cn(
                              'h-1 w-1 flex-shrink-0 rounded-full',
                              item.isDone ? '' : 'border'
                            )}
                            style={item.isDone
                              ? { backgroundColor: item.color }
                              : { borderColor: item.color }
                            }
                          />
                        ))}
                        {overflow > 0 && (
                          <span className="text-[8px] text-[var(--color-text-disabled)]">+{overflow}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <AnimatePresence>
              {showAnytimeRow && !showAnytimeCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden border-t border-[var(--color-border)]"
                >
                  {maxAnytimePerDay > ANYTIME_COLLAPSE_THRESHOLD && (
                    <button
                      onClick={() => setAnytimeExpanded(false)}
                      className="flex w-full items-center justify-between px-3 py-1 text-[10px] text-[var(--color-text-disabled)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
                    >
                      <span>종일 {totalWeekAnytime}개</span>
                      <span>접기 ▴</span>
                    </button>
                  )}
                  <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
                    <div className="sticky left-0 z-10 flex items-center justify-center bg-[var(--color-bg-primary)] px-1 py-1.5">
                      {maxAnytimePerDay <= ANYTIME_COLLAPSE_THRESHOLD && (
                        <span className="text-xs text-[var(--color-text-disabled)]">종일</span>
                      )}
                    </div>
                    {weekDays.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd')
                      const anytimeTasks = layoutByDate[dateStr]?.anytime ?? []
                      const allDayEvents = googleSlotsByDate[dateStr]?.allDay ?? []
                      const isDayPast = isBefore(day, startOfToday())

                      return (
                        <div
                          key={dateStr}
                          className="flex min-w-0 flex-col gap-1 border-l border-[var(--color-border)]/50 px-0.5 py-1"
                        >
                          {anytimeTasks.slice(0, ANYTIME_MAX_VISIBLE).map((task) => (
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
                          {allDayEvents.slice(0, ANYTIME_MAX_VISIBLE).map((event) => (
                            <SlotGoogleEventRow key={event.id} event={event} />
                          ))}
                          {anytimeTasks.length + allDayEvents.length > ANYTIME_MAX_VISIBLE && (
                            <button
                              onClick={() => setCurrentDate(day)}
                              className="w-full rounded-[var(--chip-radius,8px)] border border-dashed border-[var(--color-border)]/50 px-1 py-0.5 text-[10px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] min-h-[24px] flex items-center justify-center"
                            >
                              +{anytimeTasks.length + allDayEvents.length - ANYTIME_MAX_VISIBLE}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── 4-Block grid body ── */}
          <div ref={gridBodyRef} className="grid flex-1" style={{ gridTemplateColumns: gridColumns }}>
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
                      ...(currentSlot !== slot ? { backgroundColor: `var(--color-slot-${slot})` } : {}),
                      ...(gutterHeight ? { height: `${gutterHeight}px` } : { minHeight: '40px' }),
                    }}
                  >
                    <span className="text-center text-sm leading-tight text-[var(--color-text-disabled)]">
                      {config.emoji}
                    </span>
                    {/* Hide hour range text when dawn is collapsed to save space */}
                    {!isDawnEmpty && (
                      <span className={cn(
                        'text-[9px] leading-none',
                        currentSlot === slot ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-text-disabled)]'
                      )}>
                        {config.hours[0]}-{config.hours[1]}
                      </span>
                    )}
                    {/* "Now" indicator for current slot */}
                    {currentSlot === slot && (
                      <span className="mt-0.5 text-[8px] font-semibold leading-none text-[var(--color-primary-500)]">
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
                    'flex flex-col border-l border-[var(--color-border)]/50',
                    dayIsToday && 'bg-[var(--color-primary-50)]/20'
                  )}
                >
                  {DISPLAY_SLOTS.map((slot) => {
                    const slotIsPast = dayIsToday && !isSlotCurrent(slot, currentSlot)
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

      {/* Empty state */}
      {!hasAnyTasks && (
        <div className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">
          이번 주에 예정된 할 일이 없어요
        </div>
      )}
    </div>
  )
}
