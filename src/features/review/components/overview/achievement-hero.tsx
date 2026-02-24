'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { StreakBadge } from '@/components/ui/badge'
import { ProgressRing } from '@/components/common/progress-ring'
import { DeltaChip } from '@/components/common/delta-chip'
import { generateGreeting, generateInsightText } from '../../utils/generate-insight'
import type { OverviewStats, ActiveStreak } from '../../utils/timeline-utils'
import type { DayHistory } from '../../hooks/use-checkin-history'
import type { ComparisonData } from '../../hooks/use-comparison-data'

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
  actions?: React.ReactNode
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const RING_SIZE = 88
const RING_STROKE = 7

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
  actions,
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
        'relative rounded-2xl p-4',
        isZero
          ? 'bg-[var(--color-bg-secondary)]'
          : 'bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-bg-card)]'
      )}
    >
      {actions && <div className="absolute top-3 right-3">{actions}</div>}

      {/* Horizontal layout: ring left, content right */}
      <div className="flex items-center gap-4">
        <ProgressRing size={RING_SIZE} strokeWidth={RING_STROKE} rate={stats.completionRate} />

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
