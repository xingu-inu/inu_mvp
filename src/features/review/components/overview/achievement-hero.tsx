'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { StreakBadge } from '@/components/ui/badge'
import { generateGreeting, generateInsightText } from '../../utils/generate-insight'
import type { OverviewStats, ActiveStreak } from '../../utils/timeline-utils'
import type { DayHistory } from '../../hooks/use-checkin-history'
import type { ComparisonData } from '../../hooks/use-comparison-data'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const RING_SIZE = 88
const RING_STROKE = 7
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AchievementHeroProps {
  stats: OverviewStats
  streaks: ActiveStreak[]
  checkInHistory: DayHistory[]
  totalDays: number
  period: 'week' | 'month'
  comparison: ComparisonData
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ProgressRing({ rate, isZero }: { rate: number; isZero: boolean }) {
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
          'absolute font-mono text-2xl font-extrabold',
          isZero ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'
        )}
      >
        {rate}
        <span className="text-sm font-semibold text-[var(--color-text-tertiary)]">%</span>
      </span>
    </div>
  )
}

function DeltaChip({
  label,
  delta,
  suffix,
  isMood = false,
}: {
  label: string
  delta: number
  suffix: string
  isMood?: boolean
}) {
  const isPositive = delta > 0
  const isNeutral = delta === 0
  const displayValue = isMood ? Math.abs(delta).toFixed(1) : Math.abs(delta)
  const sign = isPositive ? '+' : isNeutral ? '' : '-'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        isPositive && 'bg-emerald-50 text-emerald-700',
        isNeutral && 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]',
        !isPositive &&
          !isNeutral &&
          'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
      )}
    >
      <span>{label}</span>
      <span>
        {sign}
        {displayValue}
        {suffix}
      </span>
    </span>
  )
}

function ComparisonChips({ comparison }: { comparison: ComparisonData; isWeek: boolean }) {
  if (!comparison.hasPrevData) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      <DeltaChip label="실천율" delta={comparison.completionDelta} suffix="%p" />
      <DeltaChip label="활동일" delta={comparison.activeDaysDelta} suffix="일" />
      {comparison.moodDelta !== null && (
        <DeltaChip label="기분" delta={comparison.moodDelta} suffix="" isMood />
      )}
    </div>
  )
}

function StreakStrip({ streaks }: { streaks: ActiveStreak[] }) {
  if (streaks.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {streaks.map((streak) => (
        <div
          key={streak.taskId}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1"
        >
          <StreakBadge count={streak.streakCount} />
          <span className="text-xs" aria-hidden="true">
            {streak.areaEmoji}
          </span>
          <span className="max-w-[80px] truncate text-xs text-[var(--color-text-secondary)]">
            {streak.taskName}
          </span>
        </div>
      ))}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function AchievementHero({
  stats,
  streaks,
  checkInHistory,
  totalDays,
  period,
  comparison,
}: AchievementHeroProps) {
  const isZero = stats.completionRate === 0

  const narrative = isZero
    ? '쉬어가는 것도 여정의 일부예요'
    : generateGreeting(
        { checkInRate: stats.completionRate, currentStreak: stats.currentStreak },
        checkInHistory,
        totalDays,
        period
      )

  const insightText = generateInsightText(checkInHistory, period)

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'rounded-2xl p-4',
        isZero
          ? 'bg-[var(--color-bg-secondary)]'
          : 'bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-bg-card)]'
      )}
    >
      {/* Horizontal layout: ring left, content right */}
      <div className="flex items-center gap-4">
        <ProgressRing rate={stats.completionRate} isZero={isZero} />

        <div className="min-w-0 flex-1 space-y-1.5">
          <p
            className={cn(
              'text-sm leading-snug',
              isZero ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-secondary)]'
            )}
          >
            {narrative}
          </p>

          {insightText && (
            <p className="text-xs text-[var(--color-text-tertiary)]">{insightText}</p>
          )}

          {/* Comparison delta chips */}
          <ComparisonChips comparison={comparison} isWeek={period === 'week'} />

          <StreakStrip streaks={streaks} />
        </div>
      </div>
    </motion.section>
  )
}
