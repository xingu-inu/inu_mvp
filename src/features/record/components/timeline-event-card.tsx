'use client'

import { Target, Footprints, User, Compass, X } from 'lucide-react'
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
  onHide?: (eventId: string, eventType: TimelineEventType) => void
}

export function TimelineEventCard({ event, onHide }: TimelineEventCardProps) {
  const Icon = EVENT_ICONS[event.type]

  return (
    <div className="group/hide relative flex gap-3 py-2.5">
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

            {/* Profile trait before/after */}
            {event.type === 'profile_trait' && event.fromStatus && event.toStatus && (
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                <span className="text-[var(--color-text-disabled)]">{event.fromStatus}</span>
                <span className="mx-1">→</span>
                <span className="text-[var(--color-text-secondary)]">{event.toStatus}</span>
              </p>
            )}

            {/* Description (for non-trait events or trait creation) */}
            {event.description &&
              !(event.type === 'profile_trait' && event.fromStatus && event.toStatus) && (
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

      {/* Hide button — visible on hover */}
      {onHide && (
        <button
          type="button"
          onClick={() => onHide(event.id, event.type)}
          aria-label="이 항목 숨기기"
          className="absolute top-7 right-0 shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover/hide:opacity-100 hover:bg-[var(--color-bg-tertiary)]"
        >
          <X className="h-3 w-3 text-[var(--color-text-tertiary)]" />
        </button>
      )}
    </div>
  )
}
