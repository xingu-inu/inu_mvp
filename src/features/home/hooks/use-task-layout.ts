import { useMemo } from 'react'
import type { HomeTask, TimeSlot } from '@/types/entities'
import type { GoogleCalendarEvent } from '@/types/google-calendar'

/** 4개 시간대 슬롯 + anytime 으로 분류된 task 레이아웃 */
export interface SlotLayout {
  dawn: HomeTask[]
  morning: HomeTask[]
  afternoon: HomeTask[]
  evening: HomeTask[]
  anytime: HomeTask[]
}

/** Google Calendar 이벤트의 슬롯별 분류 */
export interface SlotGoogleEvents {
  dawn: GoogleCalendarEvent[]
  morning: GoogleCalendarEvent[]
  afternoon: GoogleCalendarEvent[]
  evening: GoogleCalendarEvent[]
  allDay: GoogleCalendarEvent[]
}

/**
 * Parse "HH:MM" string to total minutes from midnight.
 */
export function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Sort comparator for tasks within a slot:
 * 1. Tasks with specific_time first (ascending by time)
 * 2. Tasks without specific_time last (ascending by sort_order)
 */
function slotTaskComparator(a: HomeTask, b: HomeTask): number {
  const aHasTime = !!a.specific_time
  const bHasTime = !!b.specific_time

  if (aHasTime && bHasTime) {
    return parseTime(a.specific_time!) - parseTime(b.specific_time!)
  }
  if (aHasTime && !bHasTime) return -1
  if (!aHasTime && bHasTime) return 1

  // Both without specific_time: sort by sort_order (fractional indexing)
  const aOrder = a.sort_order ?? ''
  const bOrder = b.sort_order ?? ''
  return aOrder < bOrder ? -1 : aOrder > bOrder ? 1 : 0
}

/**
 * Bucket tasks into time-slot groups and sort within each.
 */
export function computeSlotLayout(tasks: HomeTask[]): SlotLayout {
  const layout: SlotLayout = {
    dawn: [],
    morning: [],
    afternoon: [],
    evening: [],
    anytime: [],
  }

  for (const task of tasks) {
    const slot = task.time_slot as TimeSlot | null | undefined
    if (slot && slot !== 'anytime' && slot in layout) {
      layout[slot as keyof SlotLayout].push(task)
    } else {
      layout.anytime.push(task)
    }
  }

  // Sort each slot
  layout.dawn.sort(slotTaskComparator)
  layout.morning.sort(slotTaskComparator)
  layout.afternoon.sort(slotTaskComparator)
  layout.evening.sort(slotTaskComparator)
  layout.anytime.sort(slotTaskComparator)

  return layout
}

/**
 * Bucket Google Calendar events into time-slot groups.
 * Cross-slot events go to the start slot only.
 * All-day events go to allDay.
 */
export function assignGoogleEventsToSlots(events: GoogleCalendarEvent[]): SlotGoogleEvents {
  const result: SlotGoogleEvents = {
    dawn: [],
    morning: [],
    afternoon: [],
    evening: [],
    allDay: [],
  }

  for (const event of events) {
    if (event.isAllDay) {
      result.allDay.push(event)
      continue
    }

    const startMin = event.startMinutes
    if (startMin < 360) {
      result.dawn.push(event)
    } else if (startMin < 720) {
      result.morning.push(event)
    } else if (startMin < 1080) {
      result.afternoon.push(event)
    } else {
      result.evening.push(event)
    }
  }

  // Sort each slot by start time
  const sortByStart = (a: GoogleCalendarEvent, b: GoogleCalendarEvent) =>
    a.startMinutes - b.startMinutes
  result.dawn.sort(sortByStart)
  result.morning.sort(sortByStart)
  result.afternoon.sort(sortByStart)
  result.evening.sort(sortByStart)

  return result
}

/**
 * Hook: compute slot-based task layout for all days in a week.
 */
export function useTaskLayout(tasksByDate: Record<string, HomeTask[]>): Record<string, SlotLayout> {
  return useMemo(() => {
    const result: Record<string, SlotLayout> = {}
    for (const [dateStr, tasks] of Object.entries(tasksByDate)) {
      result[dateStr] = computeSlotLayout(tasks)
    }
    return result
  }, [tasksByDate])
}
