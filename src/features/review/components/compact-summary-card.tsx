'use client'

import { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StreakBadge } from '@/components/ui/badge'
import { AiIcon } from '@/components/common/ai-icon'
import { PhasedLoading } from './phased-loading'
import { useReviewInsight } from '../hooks/use-review-insight'
import { MOOD_VALUES, MOOD_EMOJIS, getAvgMoodLabel } from '../utils/review-utils'
import type { OverviewStats, ActiveStreak, AreaBalance } from '../utils/timeline-utils'
import type { ComparisonData } from '../hooks/use-comparison-data'
import type { MoodEntry } from '../hooks/use-mood-history'
import type { AiReviewInsightContext } from '@/lib/ai/types'

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
  areaBalances: AreaBalance[]
  isWeek: boolean
  periodLabel: string
  growthMessage?: string | null
  weeklyReflection?: {
    highlight?: string | null
    challenge?: string | null
    next_focus?: string | null
  } | null
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
        <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)]">%</span>
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
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium tabular-nums select-none',
        isPositive && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        isZero && 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]',
        !isPositive && !isZero && 'bg-[var(--color-miss-bg)] text-[var(--color-miss)]'
      )}
    >
      {isZero ? '±0%p' : isPositive ? `+${delta}%p` : `${delta}%p`}
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
  areaBalances,
  isWeek,
  periodLabel,
  growthMessage,
  weeklyReflection,
}: CompactSummaryCardProps) {
  const isZero = stats.completionRate === 0
  const { data: aiData, isLoading: aiLoading, error: aiError, generate, reset } = useReviewInsight()
  const [aiExpanded, setAiExpanded] = useState(false)

  const handleAiToggle = useCallback(() => {
    if (!aiExpanded && !aiData && !aiLoading && !aiError) {
      const context: AiReviewInsightContext = {
        period: isWeek ? 'week' : 'month',
        periodLabel,
        completionRate: stats.completionRate,
        activeDays: stats.activeDays,
        totalDays: stats.totalDays,
        avgMoodLabel: stats.avgMoodLabel,
        moodTrend: (moodHistory ?? []).map((m) => ({ date: m.date, mood: m.mood })),
        topStreaks: streaks.slice(0, 5).map((s) => ({
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
    }
    setAiExpanded((v) => !v)
  }, [
    aiExpanded,
    aiData,
    aiLoading,
    aiError,
    isWeek,
    periodLabel,
    stats,
    moodHistory,
    streaks,
    areaBalances,
    weeklyReflection,
    generate,
  ])

  const handleRefresh = useCallback(() => {
    reset()
    const context: AiReviewInsightContext = {
      period: isWeek ? 'week' : 'month',
      periodLabel,
      completionRate: stats.completionRate,
      activeDays: stats.activeDays,
      totalDays: stats.totalDays,
      avgMoodLabel: stats.avgMoodLabel,
      moodTrend: (moodHistory ?? []).map((m) => ({ date: m.date, mood: m.mood })),
      topStreaks: streaks.slice(0, 5).map((s) => ({
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
  }, [
    reset,
    generate,
    isWeek,
    periodLabel,
    stats,
    moodHistory,
    streaks,
    areaBalances,
    weeklyReflection,
  ])

  const { avgMoodEmoji, avgMoodNarrative } = useMemo(() => {
    if (!moodHistory?.length) {
      return { avgMoodEmoji: '—', avgMoodNarrative: null }
    }
    const avg = moodHistory.reduce((sum, m) => sum + MOOD_VALUES[m.mood], 0) / moodHistory.length
    const label = getAvgMoodLabel(avg)
    const emoji = MOOD_EMOJIS[label]

    let narrative: string | null = null
    if (moodHistory.length >= 2) {
      switch (label) {
        case 'great':
          narrative = '기분 좋은 날이 많았어요'
          break
        case 'good':
          narrative = '대체로 좋은 기분'
          break
        case 'neutral':
          narrative = '평온한 기간'
          break
        case 'bad':
        case 'terrible':
          narrative = '힘든 날도 있었어요'
          break
      }
    }

    return { avgMoodEmoji: emoji, avgMoodNarrative: narrative }
  }, [moodHistory])

  const topStreaks = useMemo(() => streaks.slice(0, 3), [streaks])

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4"
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
          이번 기간 요약
        </p>
        <button
          type="button"
          onClick={handleAiToggle}
          className={cn(
            'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
            aiExpanded
              ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-500)] dark:bg-[var(--color-primary-900)]/10'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-primary-400)]'
          )}
        >
          <Sparkles className="h-3 w-3" />
          AI 분석
          {aiExpanded && <ChevronUp className="h-3 w-3" />}
        </button>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-4">
        <CompactRing rate={stats.completionRate} isZero={isZero} />

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
          {isZero ? (
            <span className="text-sm text-[var(--color-text-tertiary)]">
              쉬어가는 것도 여정의 일부예요
            </span>
          ) : (
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {stats.totalDone}개 완료
            </span>
          )}

          {avgMoodEmoji !== '—' && avgMoodNarrative && (
            <span
              className="flex items-center gap-0.5 text-sm text-[var(--color-text-secondary)]"
              title="평균 기분"
            >
              <span>{avgMoodEmoji}</span>
              <span>{avgMoodNarrative}</span>
            </span>
          )}

          {topStreaks.length > 0 && (
            <div className="flex items-center gap-1">
              {topStreaks.map((streak) => (
                <StreakBadge key={streak.taskId} count={streak.streakCount} />
              ))}
            </div>
          )}

          {comparison.hasPrevData && <ComparisonChip delta={comparison.completionDelta} />}
        </div>
      </div>

      {/* Growth message */}
      {growthMessage && (
        <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-text-tertiary)]">
          {growthMessage}
        </p>
      )}

      {/* AI Analysis expandable section */}
      <AnimatePresence initial={false}>
        {aiExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-[var(--color-border)] pt-3">
              <PhasedLoading isLoading={aiLoading} />

              {aiError && (
                <div className="rounded-lg bg-red-50 p-2.5 dark:bg-red-900/10">
                  <p className="text-xs text-red-600 dark:text-red-400">{aiError}</p>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="mt-1 text-xs font-medium text-red-600 underline dark:text-red-400"
                  >
                    다시 시도
                  </button>
                </div>
              )}

              {aiData && (
                <div className="space-y-4">
                  {aiData.patterns.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
                        발견한 패턴
                      </p>
                      {aiData.patterns.map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <AiIcon
                            name={item.icon}
                            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]"
                          />
                          <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {aiData.coaching.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
                        제안
                      </p>
                      {aiData.coaching.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 rounded-lg bg-[var(--color-primary-50)] p-2.5 dark:bg-[var(--color-primary-900)]/10"
                        >
                          <AiIcon
                            name={item.icon}
                            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary-500)]"
                          />
                          <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {aiData.encouragement && (
                    <p className="text-center text-base leading-relaxed text-[var(--color-text-tertiary)] italic">
                      &ldquo;{aiData.encouragement}&rdquo;
                    </p>
                  )}

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={aiLoading}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
                    >
                      <RefreshCw className={cn('h-3 w-3', aiLoading && 'animate-spin')} />
                      다시 분석
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
