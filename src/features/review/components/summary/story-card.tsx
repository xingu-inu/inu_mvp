'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { StreakBadge } from '@/components/ui/badge'
import { generateGreeting, generateInsightText } from '../../utils/generate-insight'
import { useReviewInsight } from '../../hooks/use-review-insight'
import type { OverviewStats, ActiveStreak, AreaBalance } from '../../utils/timeline-utils'
import type { DayHistory } from '../../hooks/use-checkin-history'
import type { ComparisonData } from '../../hooks/use-comparison-data'
import type { MoodEntry } from '../../hooks/use-mood-history'
import type { AiReviewInsightContext } from '@/lib/ai/types'
import type { WeeklyReflection } from '@/types/entities'

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

interface StoryCardProps {
  stats: OverviewStats
  streaks: ActiveStreak[]
  checkInHistory: DayHistory[]
  totalDays: number
  period: 'week' | 'month'
  comparison: ComparisonData
  areaBalances: AreaBalance[]
  moodHistory: MoodEntry[] | undefined
  isWeek: boolean
  periodLabel: string
  weeklyReflection?: WeeklyReflection | null
  isCurrentVersion: boolean
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
        isPositive && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
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

function InsightShimmer() {
  return (
    <div className="space-y-2 pt-1">
      {[80, 60, 70].map((w) => (
        <div
          key={w}
          className="h-3 animate-pulse rounded-md bg-gradient-to-r from-[var(--color-bg-tertiary)] via-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)]"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function StoryCard({
  stats,
  streaks,
  checkInHistory,
  totalDays,
  period,
  comparison,
  areaBalances,
  moodHistory,
  isWeek,
  periodLabel,
  weeklyReflection,
  isCurrentVersion,
}: StoryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { data: insightData, isLoading, error, generate } = useReviewInsight()

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

  // Auto-generate AI insight on mount if current version
  useEffect(() => {
    if (!isCurrentVersion) return

    const context: AiReviewInsightContext = {
      period: isWeek ? 'week' : 'month',
      periodLabel,
      completionRate: stats.completionRate,
      activeDays: stats.activeDays,
      totalDays,
      avgMoodLabel: stats.avgMoodLabel,
      moodTrend: (moodHistory ?? []).map((m) => ({ date: m.date, mood: m.mood })),
      topStreaks: streaks
        .slice(0, 3)
        .map((s) => ({ taskName: s.taskName, count: s.streakCount, areaName: s.areaName })),
      areaBalances: areaBalances.map((a) => ({
        areaName: a.areaName,
        completionRate: a.completionRate,
      })),
      weeklyReflection: weeklyReflection
        ? {
            highlight: weeklyReflection.highlight ?? undefined,
            challenge: weeklyReflection.challenge ?? undefined,
            next_focus: weeklyReflection.next_focus ?? undefined,
          }
        : undefined,
    }

    void generate(context)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrentVersion, periodLabel])

  const topStreaks = streaks.slice(0, 3)

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
      {/* Horizontal layout: ring left, content right */}
      <div className="flex items-start gap-4">
        <ProgressRing rate={stats.completionRate} isZero={isZero} />

        <div className="min-w-0 flex-1 space-y-1.5">
          {/* AI narrative */}
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
          {comparison.hasPrevData && (
            <div className="flex flex-wrap gap-1.5">
              <DeltaChip label="실천율" delta={comparison.completionDelta} suffix="%p" />
              <DeltaChip label="활동일" delta={comparison.activeDaysDelta} suffix="일" />
              {comparison.moodDelta !== null && (
                <DeltaChip label="기분" delta={comparison.moodDelta} suffix="" isMood />
              )}
            </div>
          )}

          {/* Active streaks strip */}
          {topStreaks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {topStreaks.map((streak) => (
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
          )}
        </div>
      </div>

      {/* AI Insight section */}
      {isCurrentVersion && (
        <div className="mt-3 border-t border-[var(--color-border)] pt-3">
          {isLoading && <InsightShimmer />}

          {error && !isLoading && (
            <p className="text-xs text-[var(--color-text-tertiary)]">
              분석을 불러오지 못했어요.{' '}
              <button
                type="button"
                onClick={() => {
                  const context: AiReviewInsightContext = {
                    period: isWeek ? 'week' : 'month',
                    periodLabel,
                    completionRate: stats.completionRate,
                    activeDays: stats.activeDays,
                    totalDays,
                    avgMoodLabel: stats.avgMoodLabel,
                    moodTrend: (moodHistory ?? []).map((m) => ({ date: m.date, mood: m.mood })),
                    topStreaks: streaks.slice(0, 3).map((s) => ({
                      taskName: s.taskName,
                      count: s.streakCount,
                      areaName: s.areaName,
                    })),
                    areaBalances: areaBalances.map((a) => ({
                      areaName: a.areaName,
                      completionRate: a.completionRate,
                    })),
                    weeklyReflection: weeklyReflection
                      ? {
                          highlight: weeklyReflection.highlight ?? undefined,
                          challenge: weeklyReflection.challenge ?? undefined,
                          next_focus: weeklyReflection.next_focus ?? undefined,
                        }
                      : undefined,
                  }
                  void generate(context)
                }}
                className="underline"
              >
                다시 시도
              </button>
            </p>
          )}

          {insightData && !isLoading && (
            <div className="space-y-1.5">
              {insightData.encouragement && (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  <span className="mr-1">💡</span>
                  {insightData.encouragement}
                </p>
              )}

              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="text-[10px] text-[var(--color-text-tertiary)] underline-offset-2 hover:underline"
              >
                {expanded ? '접기' : '자세히 보기'}
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-1">
                      {insightData.patterns.length > 0 && (
                        <div className="space-y-1">
                          {insightData.patterns.map((item, i) => (
                            <p key={i} className="text-xs text-[var(--color-text-secondary)]">
                              {item.emoji} {item.text}
                            </p>
                          ))}
                        </div>
                      )}
                      {insightData.coaching.length > 0 && (
                        <div className="space-y-1">
                          {insightData.coaching.map((item, i) => (
                            <p key={i} className="text-xs text-[var(--color-text-tertiary)]">
                              {item.emoji} {item.text}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </motion.section>
  )
}
