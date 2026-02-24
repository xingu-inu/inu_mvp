'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { AreaReviewData } from '../../hooks/use-review-roadmap-data'
import type { ActivityEvent } from '../../hooks/use-activity-log'
import type { ActiveStreak, AreaBalance } from '../../utils/timeline-utils'
import type { ComparisonData } from '../../hooks/use-comparison-data'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface HighlightsProps {
  roadmapData: AreaReviewData[]
  activityEvents: ActivityEvent[]
  streaks: ActiveStreak[]
  comparison: ComparisonData
  areaBalances: AreaBalance[]
}

interface Highlight {
  emoji: string
  text: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Logic
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateHighlights(
  activityEvents: ActivityEvent[],
  streaks: ActiveStreak[],
  comparison: ComparisonData,
  areaBalances: AreaBalance[]
): Highlight[] {
  const highlights: Highlight[] = []

  // 1. Streak highlights (>= 5 days)
  const topStreak = streaks.find((s) => s.streakCount >= 5)
  if (topStreak) {
    highlights.push({
      emoji: '🔥',
      text: `${topStreak.taskName} ${topStreak.streakCount}일 연속`,
    })
  }

  // 2. Completions: group-completed or goal-completed events
  const completionEvent = activityEvents.find(
    (e) => e.type === 'group-completed' || e.type === 'goal-completed'
  )
  if (completionEvent) {
    highlights.push({
      emoji: '✅',
      text: `${completionEvent.entityName} 완료`,
    })
  }

  // 3. Area records: completionRate >= 80 AND comparison delta > 15
  if (comparison.hasPrevData) {
    const topArea = areaBalances.find(
      (a) => a.completionRate >= 80 && comparison.completionDelta > 15
    )
    if (topArea) {
      const delta = comparison.completionDelta
      highlights.push({
        emoji: '📈',
        text: `${topArea.areaEmoji} ${topArea.areaName} ${Math.round(topArea.completionRate)}% (+${delta}%p)`,
      })
    }
  }

  // 4. New goals
  const newGoalEvent = activityEvents.find((e) => e.type === 'goal-created')
  if (newGoalEvent) {
    highlights.push({
      emoji: '🎯',
      text: `새 목표: ${newGoalEvent.entityName}`,
    })
  }

  return highlights.slice(0, 3)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function Highlights({
  roadmapData: _roadmapData,
  activityEvents,
  streaks,
  comparison,
  areaBalances,
}: HighlightsProps) {
  const highlights = useMemo(
    () => generateHighlights(activityEvents, streaks, comparison, areaBalances),
    [activityEvents, streaks, comparison, areaBalances]
  )

  if (highlights.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
    >
      <span className="mb-1.5 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
        이번 기간 하이라이트
      </span>
      <div className="space-y-1.5">
        {highlights.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm" aria-hidden="true">
              {h.emoji}
            </span>
            <span className="text-sm text-[var(--color-text-secondary)]">{h.text}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
