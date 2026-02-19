'use client'

import { memo } from 'react'
import type { GoogleCalendarEvent } from '@/types/google-calendar'

interface SlotGoogleEventRowProps {
  event: GoogleCalendarEvent
}

function formatEventTime(startMinutes: number, durationMinutes: number): string {
  const startH = Math.floor(startMinutes / 60)
  const startM = startMinutes % 60
  const endMinutes = startMinutes + durationMinutes
  const endH = Math.floor(endMinutes / 60)
  const endM = endMinutes % 60
  const fmt = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  return `${fmt(startH, startM)} – ${fmt(endH, endM)}`
}

function formatStartTime(startMinutes: number): string {
  const h = Math.floor(startMinutes / 60)
  const m = startMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const SlotGoogleEventRow = memo(function SlotGoogleEventRow({
  event,
}: SlotGoogleEventRowProps) {
  const handleClick = () => {
    window.open(event.htmlLink, '_blank', 'noopener,noreferrer')
  }

  const tooltip = event.isAllDay
    ? event.summary
    : `${event.summary} (${formatEventTime(event.startMinutes, event.durationMinutes)})`

  return (
    <button
      onClick={handleClick}
      title={tooltip}
      aria-label={tooltip}
      className="flex min-h-[var(--chip-h,32px)] w-full cursor-pointer items-center gap-1 rounded-[var(--chip-radius,8px)] border-l-[3px] border-[var(--color-google-event)] bg-[var(--color-google-event-bg)] px-2 py-[var(--chip-py,3px)] text-left transition-all duration-150 hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--color-primary-300)] focus-visible:outline-none active:scale-[0.98]"
    >
      {!event.isAllDay && (
        <span className="flex-shrink-0 text-[length:var(--chip-time-font-size,10px)] text-[var(--chip-time-color)] tabular-nums">
          {formatStartTime(event.startMinutes)}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-[length:var(--chip-font-size,12px)] leading-[var(--chip-line-height,1.35)] font-medium text-[var(--color-text-secondary)]">
        {event.summary}
      </span>
    </button>
  )
})
