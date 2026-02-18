'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReviewInsight } from '../../hooks/use-review-insight'
import type { AiReviewInsightContext } from '@/lib/ai/types'
import type { OverviewStats, ActiveStreak, AreaBalance } from '../../utils/timeline-utils'
import type { MoodEntry } from '../../hooks/use-mood-history'

interface AiReviewInsightCardProps {
  overviewStats: OverviewStats
  activeStreaks: ActiveStreak[]
  areaBalances: AreaBalance[]
  moodHistory: MoodEntry[] | undefined
  isWeek: boolean
  periodLabel: string
  weeklyReflection?: { highlight?: string | null; challenge?: string | null; next_focus?: string | null } | null
}

export function AiReviewInsightCard({
  overviewStats,
  activeStreaks,
  areaBalances,
  moodHistory,
  isWeek,
  periodLabel,
  weeklyReflection,
}: AiReviewInsightCardProps) {
  const { data, isLoading, error, generate, reset } = useReviewInsight()
  const [isExpanded, setIsExpanded] = useState(true)

  const handleGenerate = useCallback(() => {
    const context: AiReviewInsightContext = {
      period: isWeek ? 'week' : 'month',
      periodLabel,
      completionRate: overviewStats.completionRate,
      activeDays: overviewStats.activeDays,
      totalDays: overviewStats.totalDays,
      avgMoodLabel: overviewStats.avgMoodLabel,
      moodTrend: (moodHistory ?? []).map((m) => ({ date: m.date, mood: m.mood })),
      topStreaks: activeStreaks.slice(0, 5).map((s) => ({
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
  }, [isWeek, periodLabel, overviewStats, moodHistory, activeStreaks, areaBalances, weeklyReflection, generate])

  // Not yet generated — show trigger button
  if (!data && !isLoading && !error) {
    return (
      <button
        onClick={handleGenerate}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary-400)] hover:text-[var(--color-primary-400)]"
      >
        <Sparkles className="h-4 w-4" />
        AI 분석 보기
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary-400)]" />
          <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">AI 분석</h3>
        </div>
        <div className="flex items-center gap-1">
          {data && (
            <button
              onClick={() => {
                reset()
                handleGenerate()
              }}
              disabled={isLoading}
              className="rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]"
              aria-label="새로고침"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            </button>
          )}
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]"
            aria-label={isExpanded ? '접기' : '펼치기'}
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {isLoading && (
              <div className="mt-3 space-y-2">
                {[80, 65, 50].map((w, i) => (
                  <div
                    key={i}
                    className="h-4 animate-pulse rounded bg-[var(--color-bg-secondary)]"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 p-2.5 dark:bg-red-900/10">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={handleGenerate}
                  className="mt-1 text-xs font-medium text-red-600 underline dark:text-red-400"
                >
                  다시 시도
                </button>
              </div>
            )}

            {data && (
              <div className="mt-3 space-y-3">
                {/* Patterns */}
                {data.patterns.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
                      발견한 패턴
                    </p>
                    {data.patterns.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="shrink-0 text-sm">{item.emoji}</span>
                        <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{item.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Coaching */}
                {data.coaching.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
                      제안
                    </p>
                    {data.coaching.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg bg-[var(--color-primary-50)] p-2 dark:bg-[var(--color-primary-900)]/10"
                      >
                        <span className="shrink-0 text-sm">{item.emoji}</span>
                        <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{item.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Encouragement */}
                {data.encouragement && (
                  <p className="text-center text-xs italic leading-relaxed text-[var(--color-text-tertiary)]">
                    &ldquo;{data.encouragement}&rdquo;
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
