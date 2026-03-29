'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  EVENT_ICONS,
  EVENT_LABELS,
  type ActivityEvent,
  type ActivityEventType,
} from '../../hooks/use-activity-log'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const VISIBLE_TYPES: ActivityEventType[] = [
  'goal-created',
  'goal-completed',
  'group-completed',
  'task-paused',
]

const EVENT_DOT_COLORS: Record<ActivityEventType, string> = {
  'goal-created': 'bg-blue-400',
  'goal-completed': 'bg-emerald-400',
  'task-created': 'bg-gray-300',
  'task-completed': 'bg-emerald-300',
  'task-paused': 'bg-amber-400',
  'group-completed': 'bg-purple-400',
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface JourneyTimelineProps {
  events: ActivityEvent[]
  areaFilter: string | null
}

interface AreaMeta {
  id: string
  emoji: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function groupByMonth(events: ActivityEvent[]): Array<{ month: string; events: ActivityEvent[] }> {
  const map = new Map<string, ActivityEvent[]>()

  for (const ev of events) {
    const month = format(parseISO(ev.date), 'yyyy.MM')
    const existing = map.get(month) ?? []
    existing.push(ev)
    map.set(month, existing)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, evs]) => ({
      month,
      events: [...evs].sort((a, b) => b.date.localeCompare(a.date)),
    }))
}

function extractAreaMetas(events: ActivityEvent[]): AreaMeta[] {
  const seen = new Set<string>()
  const metas: AreaMeta[] = []
  for (const ev of events) {
    if (ev.areaId && !seen.has(ev.areaId)) {
      seen.add(ev.areaId)
      metas.push({ id: ev.areaId, emoji: ev.areaEmoji ?? '' })
    }
  }
  return metas
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AreaFilterPills({
  areas,
  activeId,
  onSelect,
}: {
  areas: AreaMeta[]
  activeId: string | null
  onSelect: (id: string | null) => void
}) {
  if (areas.length <= 1) return null

  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'rounded-full px-2.5 py-0.5 text-xs transition-colors',
          activeId === null
            ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-500)] ring-1 ring-[var(--color-primary-400)]'
            : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)]'
        )}
      >
        전체
      </button>
      {areas.map((area) => (
        <button
          key={area.id}
          onClick={() => onSelect(area.id)}
          className={cn(
            'rounded-full px-2.5 py-0.5 text-xs transition-colors',
            activeId === area.id
              ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-500)] ring-1 ring-[var(--color-primary-400)]'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)]'
          )}
        >
          {area.emoji}
        </button>
      ))}
    </div>
  )
}

function EventNode({ event }: { event: ActivityEvent }) {
  const dayLabel = format(parseISO(event.date), 'M/d')
  const dotColor = EVENT_DOT_COLORS[event.type] ?? 'bg-gray-300'

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative flex items-start gap-3 pb-4 pl-4"
    >
      {/* Dot */}
      <span
        className={cn(
          'absolute top-1 -left-[9px] h-[14px] w-[14px] shrink-0 rounded-full border-2 border-[var(--color-bg-card)]',
          dotColor
        )}
        title={EVENT_LABELS[event.type]}
      />

      {/* Icon + content */}
      <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{EVENT_ICONS[event.type]}</span>
            <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
              {event.entityName}
            </span>
          </div>
          {(event.areaEmoji || event.goalName) && (
            <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">
              {event.areaEmoji && <span>{event.areaEmoji} </span>}
              {event.goalName && <span>{event.goalName}</span>}
            </p>
          )}
          {event.reason && (
            <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)] italic">
              &ldquo;{event.reason}&rdquo;
            </p>
          )}
        </div>
        <span className="shrink-0 text-[10px] text-[var(--color-text-tertiary)]">{dayLabel}</span>
      </div>
    </motion.div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function JourneyTimeline({ events, areaFilter: externalFilter }: JourneyTimelineProps) {
  const [internalFilter, setInternalFilter] = useState<string | null>(externalFilter)

  const filtered = useMemo(() => {
    let evs = events.filter((e) => VISIBLE_TYPES.includes(e.type))
    if (internalFilter) {
      evs = evs.filter((e) => e.areaId === internalFilter)
    }
    return evs
  }, [events, internalFilter])

  const grouped = useMemo(() => groupByMonth(filtered), [filtered])
  const areaMetas = useMemo(
    () => extractAreaMetas(events.filter((e) => VISIBLE_TYPES.includes(e.type))),
    [events]
  )
  const multipleAreas = areaMetas.length > 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {multipleAreas && (
        <AreaFilterPills areas={areaMetas} activeId={internalFilter} onSelect={setInternalFilter} />
      )}

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-4xl">🗺️</span>
          <p className="text-sm text-[var(--color-text-tertiary)]">아직 기록된 여정이 없어요</p>
        </div>
      ) : (
        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-5"
        >
          {grouped.map(({ month, events: monthEvents }) => (
            <div key={month}>
              {/* Month header */}
              <h3 className="mb-3 border-b border-[var(--color-border)] pb-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                {month}
              </h3>

              {/* Timeline */}
              <div className="border-l-2 border-[var(--color-border)] pl-0">
                <AnimatePresence initial={false}>
                  {monthEvents.map((ev) => (
                    <EventNode key={ev.id} event={ev} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
