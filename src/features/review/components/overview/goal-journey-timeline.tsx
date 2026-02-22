'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  useGoalJourney,
  type JourneyEvent,
  type JourneyEventType,
} from '../../hooks/use-goal-journey'
import type { GoalStatus } from '@/types/entities'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const EVENT_DOT_COLORS: Record<JourneyEventType, string> = {
  'goal-created': 'bg-blue-500',
  'status-change': 'bg-amber-500',
  'group-completed': 'bg-green-500',
  'task-added': 'bg-gray-400',
  'goal-completed': 'bg-emerald-500',
}

const EVENT_CARD_STYLES: Record<JourneyEventType, string> = {
  'goal-created': 'border-blue-200 bg-blue-50',
  'status-change': 'border-amber-200 bg-amber-50',
  'group-completed': 'border-green-200 bg-green-50',
  'task-added': 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]',
  'goal-completed': 'border-emerald-200 bg-emerald-50',
}

const EVENT_TITLE_COLORS: Record<JourneyEventType, string> = {
  'goal-created': 'text-blue-700',
  'status-change': 'text-amber-700',
  'group-completed': 'text-green-700',
  'task-added': 'text-[var(--color-text-secondary)]',
  'goal-completed': 'text-emerald-700',
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatDate(isoDate: string): string {
  const d = new Date(isoDate)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function getNoGuiltMessage(toStatus: GoalStatus | undefined): string | null {
  if (toStatus === 'paused') return '쉬는 것도 과정의 일부예요'
  if (toStatus === 'archived') return '이 경험에서 배운 것들이 다음을 만들어요'
  return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Event Card
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function EventCard({ event }: { event: JourneyEvent }) {
  const noGuiltMsg = event.type === 'status-change' ? getNoGuiltMessage(event.toStatus) : null

  return (
    <div className={cn('rounded-lg border px-3 py-2', EVENT_CARD_STYLES[event.type])}>
      {/* Title */}
      <p className={cn('text-sm font-medium', EVENT_TITLE_COLORS[event.type])}>{event.title}</p>

      {/* Description */}
      {event.description && (
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{event.description}</p>
      )}

      {/* Status change: reason chip + note */}
      {event.type === 'status-change' && (
        <>
          {event.reason && (
            <span className="mt-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {event.reason}
            </span>
          )}
          {event.note && (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)] italic">{event.note}</p>
          )}
          {noGuiltMsg && (
            <p className="mt-1.5 text-[10px] text-[var(--color-text-tertiary)]">{noGuiltMsg}</p>
          )}
        </>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GoalJourneyTimelineProps {
  goalId: string
}

export function GoalJourneyTimeline({ goalId }: GoalJourneyTimelineProps) {
  const { data: events, isLoading } = useGoalJourney(goalId)

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
        <p className="text-xs text-[var(--color-text-tertiary)]">여정을 불러오는 중...</p>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-center">
        <p className="text-sm text-[var(--color-text-tertiary)]">
          아직 여정이 시작되지 않았어요 🌱
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
      <h4 className="mb-3 text-xs font-semibold text-[var(--color-text-primary)]">목표 여정</h4>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute top-0 bottom-0 left-[7px] w-px bg-[var(--color-border)]" />

        <div className="flex flex-col gap-3">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
              className="flex gap-3"
            >
              {/* Dot */}
              <div className="relative z-10 mt-2 flex-shrink-0">
                <div className={cn('h-3.5 w-3.5 rounded-full', EVENT_DOT_COLORS[event.type])} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pb-1">
                <p className="mb-1 text-[10px] text-[var(--color-text-tertiary)]">
                  {formatDate(event.date)}
                </p>
                <EventCard event={event} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
