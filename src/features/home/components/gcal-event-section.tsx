'use client'

import { useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { SlotGoogleEventRow } from './slot-google-event-row'
import type { GoogleCalendarEvent } from '@/types/google-calendar'

interface GCalEventSectionProps {
  events: GoogleCalendarEvent[]
}

export function GCalEventSection({ events }: GCalEventSectionProps) {
  const sorted = useMemo(() => {
    if (events.length === 0) return []
    return [...events].sort((a, b) => {
      // All-day events first, then by startMinutes
      if (a.isAllDay && !b.isAllDay) return -1
      if (!a.isAllDay && b.isAllDay) return 1
      return a.startMinutes - b.startMinutes
    })
  }, [events])

  if (sorted.length === 0) return null

  return (
    <section className="border-l-2 border-[var(--color-google-event)] pl-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Google Calendar
        </span>
        <span className="text-xs text-[var(--color-text-tertiary)]">{sorted.length}</span>
      </div>

      <div className="space-y-0.5">
        {sorted.map((event) => (
          <SlotGoogleEventRow key={event.id} event={event} />
        ))}
      </div>
    </section>
  )
}
