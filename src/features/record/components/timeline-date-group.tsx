'use client'

import type {
  TimelineDateGroup as TimelineDateGroupType,
  TimelineEventType,
} from '@/types/timeline'
import { TimelineEventCard } from './timeline-event-card'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const day = days[date.getDay()]
  return `${y}년 ${m}월 ${d}일 (${day})`
}

interface TimelineDateGroupProps {
  group: TimelineDateGroupType
  onHideEvent?: (eventId: string, eventType: TimelineEventType) => void
}

export function TimelineDateGroup({ group, onHideEvent }: TimelineDateGroupProps) {
  return (
    <div>
      {/* Date header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg-primary)] pt-4 pb-1">
        <h3 className="text-xs font-semibold text-[var(--color-text-tertiary)]">
          {formatDate(group.date)}
        </h3>
      </div>

      {/* Events with timeline line */}
      <div className="relative ml-3.5 border-l border-[var(--color-border)] pl-4">
        {group.events.map((event) => (
          <div key={event.id} className="relative">
            {/* Dot on timeline */}
            <div className="absolute top-4 -left-[calc(1rem+4.5px)] h-2 w-2 rounded-full border-2 border-[var(--color-border)] bg-[var(--color-bg-primary)]" />
            <TimelineEventCard event={event} onHide={onHideEvent} />
          </div>
        ))}
      </div>
    </div>
  )
}
