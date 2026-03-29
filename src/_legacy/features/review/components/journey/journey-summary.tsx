'use client'

import { motion } from 'framer-motion'
import { differenceInMonths, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import type { AreaReviewData } from '../../hooks/use-review-roadmap-data'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface JourneySummaryProps {
  roadmapData: AreaReviewData[]
}

interface GoalStat {
  total: number
  active: number
  completed: number
  paused: number
}

interface LongestJourney {
  goalName: string
  months: number
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function computeGoalStats(roadmapData: AreaReviewData[]): GoalStat {
  let total = 0
  let active = 0
  let completed = 0
  let paused = 0

  for (const areaData of roadmapData) {
    for (const goalData of areaData.goals) {
      total++
      const s = goalData.goal.status
      if (s === 'active') active++
      else if (s === 'completed') completed++
      else if (s === 'paused') paused++
    }
  }

  return { total, active, completed, paused }
}

function computeLongestJourney(roadmapData: AreaReviewData[]): LongestJourney | null {
  let best: LongestJourney | null = null
  const now = new Date()

  for (const areaData of roadmapData) {
    for (const goalData of areaData.goals) {
      const s = goalData.goal.status
      if (s !== 'active' && s !== 'completed') continue
      if (!goalData.goal.createdAt) continue

      const months = Math.max(1, differenceInMonths(now, parseISO(goalData.goal.createdAt)))
      if (!best || months > best.months) {
        best = { goalName: goalData.goal.name, months }
      }
    }
  }

  return best
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function JourneySummary({ roadmapData }: JourneySummaryProps) {
  const stats = computeGoalStats(roadmapData)
  const longest = computeLongestJourney(roadmapData)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4',
        'flex flex-col gap-2'
      )}
    >
      {/* Row 1 */}
      <div className="flex items-center gap-1.5">
        <span className="text-base">🎯</span>
        <span className="text-sm text-[var(--color-text-secondary)]">
          총 <span className="font-semibold text-[var(--color-text-primary)]">{stats.total}개</span>{' '}
          목표 중{' '}
          <span className="font-semibold text-[var(--color-text-primary)]">{stats.active}개</span>{' '}
          진행 중
        </span>
      </div>

      {/* Row 2 */}
      <div className="flex items-center gap-3 pl-0.5">
        <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
          <span>✅</span>
          <span>
            <span className="font-medium text-[var(--color-text-primary)]">
              {stats.completed}개
            </span>{' '}
            완료
          </span>
        </span>
        <span className="h-3 w-px bg-[var(--color-border)]" />
        <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
          <span>💤</span>
          <span>
            <span className="font-medium text-[var(--color-text-primary)]">{stats.paused}개</span>{' '}
            휴식 중
          </span>
        </span>
      </div>

      {/* Row 3 — longest journey */}
      {longest && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-base">🔥</span>
          <span className="text-xs text-[var(--color-text-secondary)]">
            가장 긴 여정:{' '}
            <span className="font-medium text-[var(--color-text-primary)]" title={longest.goalName}>
              {longest.goalName.length > 20
                ? `${longest.goalName.slice(0, 20)}…`
                : longest.goalName}
            </span>{' '}
            <span className="text-[var(--color-text-tertiary)]">({longest.months}개월)</span>
          </span>
        </div>
      )}
    </motion.div>
  )
}
