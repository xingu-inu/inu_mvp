'use client'

import { memo, useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { DisplaySlot } from '@/lib/constants/time-slots'
import { parseTime } from '../hooks/use-task-layout'
import { SlotTaskRow } from './slot-task-row'
import { SlotGoogleEventRow } from './slot-google-event-row'
import type { HomeTask } from '@/types/entities'
import type { GoogleCalendarEvent } from '@/types/google-calendar'

const SLOT_BG: Record<string, string> = {
  dawn: 'var(--color-slot-dawn)',
  morning: 'var(--color-slot-morning)',
  afternoon: 'var(--color-slot-afternoon)',
  evening: 'var(--color-slot-evening)',
}

interface SlotBlockProps {
  slot: DisplaySlot
  tasks: HomeTask[]
  googleEvents: GoogleCalendarEvent[]
  isNow: boolean
  isToday: boolean
  isPast: boolean
  isPastSlot?: boolean
  day: Date
  slotHeight?: number
  onTaskClick: (taskId: string | null, day: Date) => void
}

type SlotItem =
  | { type: 'task'; task: HomeTask; sortKey: number }
  | { type: 'event'; event: GoogleCalendarEvent; sortKey: number }

export const SlotBlock = memo(function SlotBlock({
  slot,
  tasks,
  googleEvents,
  isNow,
  isToday,
  isPast,
  isPastSlot,
  day,
  slotHeight,
  onTaskClick,
}: SlotBlockProps) {
  const isEmpty = tasks.length === 0 && googleEvents.length === 0
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)

  // Detect whether the content overflows (needs scroll)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setCanScroll(el.scrollHeight > el.clientHeight + 2)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [tasks.length, googleEvents.length])

  // Merge tasks and events into a single time-sorted list
  const items: SlotItem[] = []

  for (const task of tasks) {
    const sortKey = task.specific_time ? parseTime(task.specific_time) : Infinity
    items.push({ type: 'task', task, sortKey })
  }
  for (const event of googleEvents) {
    items.push({ type: 'event', event, sortKey: event.startMinutes })
  }

  items.sort((a, b) => a.sortKey - b.sortKey)

  return (
    <div
      className={cn(
        'relative border-b border-[var(--color-border)]/50 transition-colors',
        isNow && isToday && 'border-t-2 border-t-[var(--color-primary-400)] bg-[var(--color-primary-50)]/30',
        isPastSlot && !isNow && 'opacity-75',
      )}
      style={{
        ...(!(isNow && isToday) ? { backgroundColor: SLOT_BG[slot] } : {}),
        ...(slotHeight ? { height: `${slotHeight}px` } : { minHeight: '40px' }),
      }}
    >
      <div
        ref={scrollRef}
        className={cn(
          'h-full overflow-y-auto',
          // Thin scrollbar styling
          '[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--color-border)] [&::-webkit-scrollbar-track]:bg-transparent',
        )}
      >
        {!isEmpty && (
          <div className="flex flex-col gap-0.5 p-0.5">
            {items.map((item) =>
              item.type === 'task' ? (
                <SlotTaskRow
                  key={item.task.id}
                  task={item.task}
                  isPast={isPast}
                  onClick={() => onTaskClick(item.task.id, day)}
                />
              ) : (
                <SlotGoogleEventRow
                  key={item.event.id}
                  event={item.event}
                />
              )
            )}
          </div>
        )}
      </div>
      {/* Fade gradient at bottom when scrollable */}
      {canScroll && (
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-4"
          style={{
            background: `linear-gradient(to top, ${SLOT_BG[slot] ?? 'var(--color-bg-primary)'}, transparent)`,
          }}
        />
      )}
    </div>
  )
})
