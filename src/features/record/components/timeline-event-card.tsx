'use client'

import { Target, Footprints, User, Compass } from 'lucide-react'
import type { TimelineEvent, TimelineEventType } from '@/types/timeline'

const EVENT_ICONS: Record<TimelineEventType, typeof Target> = {
  goal_status: Target,
  task_status: Footprints,
  profile_trait: User,
  direction_change: Compass,
}

const EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  goal_status: '목표',
  task_status: '태스크',
  profile_trait: '프로필',
  direction_change: '방향',
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

interface TimelineEventCardProps {
  event: TimelineEvent
}

export function TimelineEventCard({ event }: TimelineEventCardProps) {
  const Icon = EVENT_ICONS[event.type]

  return (
    <div className="flex gap-3 py-2.5">
      {/* Icon */}
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)]">
        <Icon className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {/* Type + Entity name */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {EVENT_TYPE_LABELS[event.type]}
              </span>
              {event.entityName && (
                <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                  {event.entityName}
                </span>
              )}
            </div>

            {/* Title (status transition) */}
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{event.title}</p>

            {/* Description */}
            {event.description && (
              <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-tertiary)]">
                {event.description}
              </p>
            )}
          </div>

          {/* Time + Area badge */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {formatTime(event.timestamp)}
            </span>
            {event.areaEmoji && event.areaName && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-secondary)]">
                {event.areaEmoji} {event.areaName}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
