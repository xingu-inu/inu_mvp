'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { StreakBadge } from '@/components/ui/badge'
import { MOOD_VALUES, MOOD_EMOJIS, getAvgMoodLabel } from '../utils/review-utils'
import type { OverviewStats, ActiveStreak } from '../utils/timeline-utils'
import type { ComparisonData } from '../hooks/use-comparison-data'
import type { MoodEntry } from '../hooks/use-mood-history'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const RING_SIZE = 48
const RING_STROKE = 4
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface CompactSummaryCardProps {
  stats: OverviewStats
  streaks: ActiveStreak[]
  comparison: ComparisonData
  moodHistory: MoodEntry[] | undefined
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CompactRing({ rate, isZero }: { rate: number; isZero: boolean }) {
  const offset = CIRCUMFERENCE * (1 - rate / 100)

  return (
    <div className="relative flex shrink-0 items-center justify-center">
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        aria-hidden="true"
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="var(--color-bg-tertiary)"
          strokeWidth={RING_STROKE}
        />
        <motion.circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke={isZero ? 'var(--color-bg-tertiary)' : 'var(--color-primary-500)'}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: isZero ? CIRCUMFERENCE : offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <span
        className={cn(
          'absolute font-mono text-xs font-bold',
          isZero ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'
        )}
      >
        {rate}
        <span className="text-[9px] font-semibold text-[var(--color-text-tertiary)]">%</span>
      </span>
    </div>
  )
}

function ComparisonChip({ delta }: { delta: number }) {
  const isPositive = delta > 0
  const isZero = delta === 0

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
        isPositive && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        isZero && 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]',
        !isPositive && !isZero && 'bg-[var(--color-miss-bg)] text-[var(--color-miss)]'
      )}
    >
      {isZero ? '→' : isPositive ? `+${delta}%p` : `${delta}%p`}
    </span>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function CompactSummaryCard({
  stats,
  streaks,
  comparison,
  moodHistory,
}: CompactSummaryCardProps) {
  const isZero = stats.completionRate === 0

  const avgMoodEmoji = useMemo(() => {
    if (!moodHistory?.length) return '—'
    const avg = moodHistory.reduce((sum, m) => sum + MOOD_VALUES[m.mood], 0) / moodHistory.length
    return MOOD_EMOJIS[getAvgMoodLabel(avg)]
  }, [moodHistory])

  const topStreaks = useMemo(() => streaks.slice(0, 3), [streaks])

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4"
    >
      <p className="mb-2 text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
        이번 기간 요약
      </p>

      <div className="flex items-center gap-4">
        {/* Completion ring */}
        <CompactRing rate={stats.completionRate} isZero={isZero} />

        {/* Stats row */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
          {isZero ? (
            <span className="text-xs text-[var(--color-text-tertiary)]">
              쉬어가는 것도 여정의 일부예요
            </span>
          ) : (
            <span className="text-xs font-medium text-[var(--color-text-primary)]">
              {stats.completionRate}% 달성
            </span>
          )}

          {/* Average mood */}
          {avgMoodEmoji !== '—' && (
            <span
              className="flex items-center gap-0.5 text-xs text-[var(--color-text-secondary)]"
              title="평균 기분"
            >
              <span>{avgMoodEmoji}</span>
              <span>평균</span>
            </span>
          )}

          {/* Top 3 streaks */}
          {topStreaks.length > 0 && (
            <div className="flex items-center gap-1">
              {topStreaks.map((streak) => (
                <StreakBadge key={streak.taskId} count={streak.streakCount} />
              ))}
            </div>
          )}

          {/* Comparison chip */}
          {comparison.hasPrevData && <ComparisonChip delta={comparison.completionDelta} />}
        </div>
      </div>
    </motion.section>
  )
}
