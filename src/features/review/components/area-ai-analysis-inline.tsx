'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AiIcon } from '@/components/common/ai-icon'
import { PhasedLoading } from './phased-loading'
import { useDemoMode } from '@/lib/demo/demo-context'
import { useAreaAnalysis } from '../hooks/use-area-analysis'
import { useReviewPeriod } from '../hooks/use-review-period'
import type { AiAreaAnalysisContext } from '@/lib/ai/types'
import type { AreaReviewData } from '../hooks/use-review-roadmap-data'

interface AreaAiAnalysisInlineProps {
  areaData: AreaReviewData
}

export function AreaAiAnalysisInline({ areaData }: AreaAiAnalysisInlineProps) {
  const { isDemoMode } = useDemoMode()
  const { isWeek, periodLabel } = useReviewPeriod()
  const { data, isLoading, error, generate, reset } = useAreaAnalysis({
    areaId: areaData.area.id,
    period: isWeek ? 'week' : 'month',
    periodLabel,
  })
  const [expanded, setExpanded] = useState(false)

  const buildContext = useCallback(
    (): AiAreaAnalysisContext => ({
      period: isWeek ? 'week' : 'month',
      periodLabel,
      areaName: areaData.area.name,
      areaEmoji: areaData.area.emoji,
      areaWhy: areaData.area.why,
      periodCompletionRate: areaData.periodCompletionRate,
      goals: areaData.goals.map((g) => ({
        name: g.goal.name,
        status: g.goal.status,
        why: g.goal.why,
        completionRate: g.periodCompletionRate,
        taskCount: g.tasks.length,
      })),
      tasks: areaData.goals
        .flatMap((g) => g.tasks)
        .filter((t) => !t.isCrossLinked)
        .map((t) => ({
          name: t.taskName,
          why: t.why,
          completionRate: t.completionRate,
          totalDone: t.totalDone,
          totalScheduled: t.totalScheduled,
          streakCount: t.streakCount,
          bestStreak: t.bestStreak,
        })),
    }),
    [isWeek, periodLabel, areaData]
  )

  const handleToggle = useCallback(() => {
    if (!expanded && !data && !isLoading && !error) {
      void generate(buildContext())
    }
    setExpanded((v) => !v)
  }, [expanded, data, isLoading, error, generate, buildContext])

  const handleRefresh = useCallback(() => {
    reset()
    void generate(buildContext())
  }, [reset, generate, buildContext])

  if (isDemoMode) return null

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
          expanded
            ? 'text-[var(--color-primary-500)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-primary-400)]'
        )}
      >
        <Sparkles className={cn('h-4 w-4', isLoading && !expanded && 'animate-pulse')} />
        AI 영역 분석
        {isLoading && !expanded && <span className="text-xs opacity-60">분석 중...</span>}
        {expanded && <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {/* Collapsed preview — encouragement when data exists but toggle is closed */}
      {!expanded && data?.encouragement && (
        <button
          type="button"
          onClick={handleToggle}
          className="w-full border-t border-[var(--color-border)] px-4 py-2.5 transition-colors hover:bg-[var(--color-bg-secondary)]"
        >
          <p className="text-center text-xs leading-relaxed text-[var(--color-text-tertiary)] italic">
            &ldquo;{data.encouragement}&rdquo;
          </p>
        </button>
      )}

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--color-border)] px-4 pt-3 pb-4">
              <PhasedLoading isLoading={isLoading} />

              {error && (
                <div className="rounded-lg bg-red-50 p-2.5 dark:bg-red-900/10">
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="mt-1 text-xs font-medium text-red-600 underline dark:text-red-400"
                  >
                    다시 시도
                  </button>
                </div>
              )}

              {data && (
                <div className="space-y-3">
                  {data.patterns.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
                        발견한 패턴
                      </p>
                      {data.patterns.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <AiIcon
                            name={item.icon}
                            className="mt-0.5 shrink-0 text-[var(--color-text-tertiary)]"
                          />
                          <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {data.coaching.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
                        제안
                      </p>
                      {data.coaching.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 rounded-lg bg-[var(--color-primary-50)] p-2 dark:bg-[var(--color-primary-900)]/10"
                        >
                          <AiIcon
                            name={item.icon}
                            className="mt-0.5 shrink-0 text-[var(--color-primary-500)]"
                          />
                          <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {data.encouragement && (
                    <p className="text-center text-xs leading-relaxed text-[var(--color-text-tertiary)] italic">
                      &ldquo;{data.encouragement}&rdquo;
                    </p>
                  )}

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={isLoading}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
                    >
                      <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
                      다시 분석
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
