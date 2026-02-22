'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { SLOT_MAX_VISIBLE, type DisplaySlot } from '@/lib/constants/time-slots'
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

  const visibleItems = items.slice(0, SLOT_MAX_VISIBLE)
  const hiddenCount = Math.max(0, items.length - SLOT_MAX_VISIBLE)

  return (
    <div
      className={cn(
        'relative overflow-hidden border-b border-[var(--color-border)]/50 transition-colors',
        isNow &&
          isToday &&
          'border-l-[3px] border-l-[var(--color-primary-400)] bg-[var(--color-primary-50)]/50',
        isPastSlot && !isNow && 'opacity-60 saturate-75'
      )}
      style={{
        ...(!(isNow && isToday) ? { backgroundColor: SLOT_BG[slot] } : {}),
        height: slotHeight ? `${slotHeight}px` : undefined,
        minHeight: slotHeight ? undefined : '40px',
        transition: 'height 200ms ease-out, min-height 200ms ease-out',
      }}
    >
      {!isEmpty && (
        <div className="flex flex-col gap-0.5 p-0.5">
          {visibleItems.map((item) =>
            item.type === 'task' ? (
              <SlotTaskRow
                key={item.task.id}
                task={item.task}
                isPast={isPast}
                onClick={() => onTaskClick(item.task.id, day)}
              />
            ) : (
              <SlotGoogleEventRow key={item.event.id} event={item.event} />
            )
          )}
          {hiddenCount > 0 && (
            <button
              className="mx-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)]"
              onClick={() => onTaskClick(null, day)}
            >
              +{hiddenCount} more
            </button>
          )}
        </div>
      )}
    </div>
  )
})
