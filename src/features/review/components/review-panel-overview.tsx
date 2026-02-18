'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { Flame, TrendingUp, MousePointerClick } from 'lucide-react'
import { useReviewStore } from '@/stores/review.store'
import { StreakBadge } from '@/components/ui/badge'
import { extractActiveStreaks } from '../utils/timeline-utils'
import { EVENT_ICONS, EVENT_LABELS } from '../hooks/use-activity-log'
import type { AreaReviewData } from '../hooks/use-review-roadmap-data'
import type { AreaChangesSummary, ActiveStreak } from '../utils/timeline-utils'
import type { ActivityEvent, ActivityEventType } from '../hooks/use-activity-log'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_STREAKS = 3
const MAX_RECENT_EVENTS = 5

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AreaSummary {
  areaId: string
  emoji: string
  name: string
  color: string
  completionRate: number
}

function computeAreaSummaries(roadmapData: AreaReviewData[]): AreaSummary[] {
  return roadmapData.map((a) => ({
    areaId: a.area.id,
    emoji: a.area.emoji,
    name: a.area.name,
    color: a.area.color,
    completionRate: a.periodCompletionRate,
  }))
}

function computeOverallRate(roadmapData: AreaReviewData[]): number {
  let totalDone = 0
  let totalScheduled = 0

  for (const areaData of roadmapData) {
    for (const goalData of areaData.goals) {
      for (const task of goalData.tasks) {
        if (task.isCrossLinked) continue
        if (task.isActive) {
          totalDone += task.totalDone
          totalScheduled += task.totalScheduled
        }
      }
    }
  }

  return totalScheduled > 0 ? Math.round((totalDone / totalScheduled) * 100) : 0
}

function collectRecentEvents(areaChanges: AreaChangesSummary[]): ActivityEvent[] {
  const allEvents: ActivityEvent[] = []

  for (const area of areaChanges) {
    for (const event of area.events) {
      allEvents.push(event)
    }
  }

  return allEvents.sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_RECENT_EVENTS)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AreaRow({ area, onSelect }: { area: AreaSummary; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(area.areaId)}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--color-bg-secondary)]"
    >
      <span className="text-base">{area.emoji}</span>
      <span className="min-w-0 flex-1 truncate text-left text-sm text-[var(--color-text-primary)]">
        {area.name}
      </span>
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-16 rounded-full bg-[var(--color-bg-tertiary)]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${area.completionRate}%`, backgroundColor: area.color }}
          />
        </div>
        <span className="w-8 text-right font-mono text-xs text-[var(--color-text-secondary)]">
          {area.completionRate}%
        </span>
      </div>
    </button>
  )
}

function StreakRow({ streak }: { streak: ActiveStreak }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <StreakBadge count={streak.streakCount} />
      <span className="text-base">{streak.areaEmoji}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-primary)]">
        {streak.taskName}
      </span>
    </div>
  )
}

function EventRow({ event }: { event: ActivityEvent }) {
  const dateLabel = format(parseISO(event.date.slice(0, 10)), 'M/d')
  const icon = EVENT_ICONS[event.type as ActivityEventType] ?? ''
  const label = EVENT_LABELS[event.type as ActivityEventType] ?? ''

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-8 shrink-0 text-right text-xs text-[var(--color-text-tertiary)]">
        {dateLabel}
      </span>
      <span className="shrink-0 text-sm">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-primary)]">
        {event.entityName}
      </span>
      <span className="shrink-0 text-xs text-[var(--color-text-secondary)]">{label}</span>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function ReviewPanelOverview() {
  const roadmapData = useReviewStore((s) => s.roadmapData)
  const areaChanges = useReviewStore((s) => s.areaChanges)
  const selectArea = useReviewStore((s) => s.selectArea)

  const overallRate = useMemo(() => computeOverallRate(roadmapData), [roadmapData])

  const areaSummaries = useMemo(() => computeAreaSummaries(roadmapData), [roadmapData])

  const topStreaks = useMemo(
    () => extractActiveStreaks(roadmapData).slice(0, MAX_STREAKS),
    [roadmapData]
  )

  const recentEvents = useMemo(() => collectRecentEvents(areaChanges), [areaChanges])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col space-y-6 px-5 py-4"
    >
      {/* Overall completion */}
      <div className="rounded-xl bg-[var(--color-bg-secondary)] p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <span className="text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
            전체 완료율
          </span>
        </div>
        <p className="mt-2 font-mono text-3xl font-bold text-[var(--color-text-primary)]">
          {overallRate}%
        </p>
      </div>

      {/* Area breakdown */}
      {areaSummaries.length > 0 && (
        <div>
          <span className="mb-1.5 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
            영역별 현황
          </span>
          <div className="flex flex-col">
            {areaSummaries.map((area) => (
              <AreaRow key={area.areaId} area={area} onSelect={selectArea} />
            ))}
          </div>
        </div>
      )}

      {/* Top streaks */}
      {topStreaks.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
            <span className="text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
              연속 기록
            </span>
          </div>
          <div className="flex flex-col">
            {topStreaks.map((streak) => (
              <StreakRow key={streak.taskId} streak={streak} />
            ))}
          </div>
        </div>
      )}

      {/* Recent changes */}
      {recentEvents.length > 0 && (
        <div>
          <span className="mb-1.5 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
            최근 변화
          </span>
          <div className="flex flex-col">
            {recentEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Guidance */}
      <div className="flex items-center gap-2 rounded-lg px-2 py-3">
        <MousePointerClick className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
        <p className="text-xs text-[var(--color-text-tertiary)]">
          영역이나 날짜를 선택해서 자세히 보세요
        </p>
      </div>
    </motion.div>
  )
}
