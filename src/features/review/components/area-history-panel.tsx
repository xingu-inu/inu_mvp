'use client'

import { useMemo, useCallback } from 'react'
import { differenceInDays, format, parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReviewStore } from '@/stores/review.store'
import { useReviewRoadmapData } from '../hooks/use-review-roadmap-data'
import { useGoalJourneys } from '../hooks/use-goal-journeys'
import { STATUS_STYLES, STATUS_LABELS } from '@/lib/constants/goal-status'
import type { JourneyEvent } from '../hooks/use-goal-journey'
import type { AreaReviewData, GoalReviewData } from '../hooks/use-review-roadmap-data'

const EVENT_DOT_COLORS: Record<string, string> = {
  'goal-created': 'bg-emerald-400',
  'status-change': 'bg-amber-400',
  'group-completed': 'bg-blue-400',
  'goal-completed': 'bg-emerald-400',
  'task-added': 'bg-gray-400',
}

// ============================================
// GoalHistoryCard sub-component
// ============================================

interface GoalHistoryCardProps {
  goalData: GoalReviewData
  journeyEvents: JourneyEvent[] | undefined
  onSelectGoal: (goalId: string) => void
}

function GoalHistoryCard({ goalData, journeyEvents, onSelectGoal }: GoalHistoryCardProps) {
  const { goal } = goalData

  const daysSinceStart = useMemo(() => {
    if (!goal.createdAt) return null
    return differenceInDays(new Date(), parseISO(goal.createdAt))
  }, [goal.createdAt])

  const startLabel = useMemo(() => {
    if (!goal.createdAt) return null
    return format(parseISO(goal.createdAt), 'M월 d일')
  }, [goal.createdAt])

  const recentEvents = useMemo(() => {
    if (!journeyEvents) return []
    return journeyEvents.slice(-5)
  }, [journeyEvents])

  const handleClick = useCallback(() => {
    onSelectGoal(goal.id)
  }, [goal.id, onSelectGoal])

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      {/* Goal header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="min-w-0 flex-1 text-sm leading-snug font-semibold text-[var(--color-text-primary)]">
            {goal.name}
          </h4>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
              STATUS_STYLES[goal.status]
            )}
          >
            {STATUS_LABELS[goal.status]}
          </span>
        </div>

        {startLabel && (
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {startLabel} 시작
            {daysSinceStart != null && daysSinceStart >= 0 && (
              <span className="ml-1">· {daysSinceStart}일째</span>
            )}
          </p>
        )}
      </div>

      {/* Timeline events */}
      {recentEvents.length > 0 && (
        <div className="space-y-0 border-t border-[var(--color-border)] px-4 py-3">
          {recentEvents.map((event: JourneyEvent) => (
            <div key={event.id} className="flex items-start gap-2 py-1">
              <span
                className={cn(
                  'mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full',
                  EVENT_DOT_COLORS[event.type] ?? 'bg-gray-400'
                )}
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs text-[var(--color-text-primary)]">{event.title}</span>
                {event.reason && (
                  <span className="ml-1 text-xs text-[var(--color-text-tertiary)]">
                    — {event.reason}
                  </span>
                )}
              </div>
              <span className="shrink-0 text-[10px] text-[var(--color-text-tertiary)]">
                {format(parseISO(event.date), 'M/d')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer: 상세 보기 */}
      <div className="border-t border-[var(--color-border)] px-4 py-2.5">
        <button
          type="button"
          onClick={handleClick}
          className="flex w-full items-center justify-end gap-1 text-xs font-medium text-[var(--color-primary-500)] transition-colors hover:text-[var(--color-primary-600)]"
        >
          상세 보기
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ============================================
// Props
// ============================================

interface AreaHistoryPanelProps {
  areaId: string
}

// ============================================
// Main component
// ============================================

export function AreaHistoryPanel({ areaId }: AreaHistoryPanelProps) {
  const { data: roadmapData = [] } = useReviewRoadmapData()
  const selectGoal = useReviewStore((s) => s.selectGoal)

  const areaData: AreaReviewData | undefined = useMemo(
    () => roadmapData.find((a) => a.area.id === areaId),
    [roadmapData, areaId]
  )

  const sortedGoals = useMemo(() => {
    if (!areaData) return []
    return [...areaData.goals].sort((a, b) => a.goal.createdAt.localeCompare(b.goal.createdAt))
  }, [areaData])

  const goalIds = useMemo(() => sortedGoals.map((g) => g.goal.id), [sortedGoals])
  const journeyMap = useGoalJourneys(goalIds)

  const rate = areaData?.periodCompletionRate ?? 0

  if (!areaData) return null

  return (
    <motion.div
      key={areaId}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-5 px-6 py-4"
    >
      {/* Section 1: Area header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{areaData.area.emoji}</span>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {areaData.area.name}
          </h3>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="h-3 flex-1 rounded-full bg-[var(--color-bg-tertiary)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.round(rate)}%`,
                  backgroundColor: areaData.area.color,
                }}
              />
            </div>
            <span className="w-10 text-right font-mono text-sm font-semibold">
              {Math.round(rate)}%
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Goal cards */}
      {sortedGoals.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold tracking-wide text-[var(--color-text-tertiary)] uppercase">
            목표 히스토리
          </h4>
          {sortedGoals.map((goalData) => (
            <GoalHistoryCard
              key={goalData.goal.id}
              goalData={goalData}
              journeyEvents={journeyMap.get(goalData.goal.id)}
              onSelectGoal={selectGoal}
            />
          ))}
        </div>
      )}

      {/* Section 3: AI analysis placeholder */}
      <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--color-primary-500)]" />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">AI 분석</span>
        </div>
        <p className="text-xs text-[var(--color-text-tertiary)]">
          이 영역의 패턴과 코칭 제안을 AI가 분석해드려요
        </p>
        <button
          type="button"
          disabled
          className="mt-3 w-full cursor-not-allowed rounded-lg bg-[var(--color-primary-500)] px-3 py-2 text-sm font-medium text-white opacity-50"
        >
          분석 생성하기 (준비 중)
        </button>
      </div>
    </motion.div>
  )
}
