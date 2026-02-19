'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { useReviewInsight } from '../../hooks/use-review-insight'
import type { AiReviewInsightContext } from '@/lib/ai/types'
import type { OverviewStats, ActiveStreak, AreaBalance } from '../../utils/timeline-utils'
import type { MoodEntry } from '../../hooks/use-mood-history'

interface AiReviewInsightModalProps {
  overviewStats: OverviewStats
  activeStreaks: ActiveStreak[]
  areaBalances: AreaBalance[]
  moodHistory: MoodEntry[] | undefined
  isWeek: boolean
  periodLabel: string
  weeklyReflection?: {
    highlight?: string | null
    challenge?: string | null
    next_focus?: string | null
  } | null
}

export function AiReviewInsightModal({
  overviewStats,
  activeStreaks,
  areaBalances,
  moodHistory,
  isWeek,
  periodLabel,
  weeklyReflection,
}: AiReviewInsightModalProps) {
  const [open, setOpen] = useState(false)
  const { data, isLoading, error, generate, reset } = useReviewInsight()

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
  }, [
    isWeek,
    periodLabel,
    overviewStats,
    moodHistory,
    activeStreaks,
    areaBalances,
    weeklyReflection,
    generate,
  ])

  const handleOpen = () => {
    setOpen(true)
    if (!data && !isLoading && !error) {
      handleGenerate()
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary-400)] hover:text-[var(--color-primary-400)]"
      >
        <Sparkles className="h-3.5 w-3.5" />
        AI 분석
      </button>

      {/* Modal */}
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="AI 분석"
        description={`${periodLabel} 실천 패턴을 분석했어요`}
      >
        <div className="space-y-4">
          {/* Loading */}
          {isLoading && (
            <div className="space-y-3 py-4">
              {[85, 70, 55].map((w, i) => (
                <div
                  key={i}
                  className="h-4 animate-pulse rounded bg-[var(--color-bg-secondary)]"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/10">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                type="button"
                onClick={handleGenerate}
                className="mt-2 text-sm font-medium text-red-600 underline dark:text-red-400"
              >
                다시 시도
              </button>
            </div>
          )}

          {/* Content */}
          {data && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {/* Patterns */}
                {data.patterns.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
                      발견한 패턴
                    </p>
                    {data.patterns.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="shrink-0 text-base">{item.emoji}</span>
                        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Coaching */}
                {data.coaching.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
                      제안
                    </p>
                    {data.coaching.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 rounded-lg bg-[var(--color-primary-50)] p-3 dark:bg-[var(--color-primary-900)]/10"
                      >
                        <span className="shrink-0 text-base">{item.emoji}</span>
                        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Encouragement */}
                {data.encouragement && (
                  <p className="py-2 text-center text-sm leading-relaxed text-[var(--color-text-tertiary)] italic">
                    &ldquo;{data.encouragement}&rdquo;
                  </p>
                )}

                {/* Refresh */}
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      reset()
                      handleGenerate()
                    }}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
                    다시 분석
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </ResponsiveModal>
    </>
  )
}
