'use client'

import { cn } from '@/lib/utils'
import { STATUS_CHANGE_REASONS } from '@/lib/goal-status'
import { useObstacleAnalysis } from '../../hooks/use-obstacle-analysis'
import type { AreaReviewData } from '../../hooks/use-review-roadmap-data'
import type { DayHistory } from '../../hooks/use-checkin-history'
import type { TimeSlotAnalysis, SkipMissRatio } from '../../hooks/use-obstacle-analysis'

// ============================================
// Reason label lookup
// ============================================

const REASON_LABEL_MAP: Record<string, string> = Object.fromEntries(
  STATUS_CHANGE_REASONS.map((r) => [r.value, r.label])
)

function getReasonLabel(reason: string): string {
  return REASON_LABEL_MAP[reason] ?? reason
}

// ============================================
// ReasonPatternCard
// ============================================

interface ReasonPatternCardProps {
  reasonCounts: Array<{ reason: string; count: number; entity_type: 'goal' | 'task' }>
}

function ReasonPatternCard({ reasonCounts }: ReasonPatternCardProps) {
  if (reasonCounts.length === 0) return null

  // Merge goal + task counts by reason, sum them
  const merged = new Map<string, number>()
  for (const { reason, count } of reasonCounts) {
    merged.set(reason, (merged.get(reason) ?? 0) + count)
  }
  const sorted = Array.from(merged.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const maxCount = sorted[0]?.[1] ?? 1

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
      <p className="mb-0.5 text-[11px] text-[var(--color-text-tertiary)]">
        이번 기간 가장 많이 등장한 막힘 사유예요
      </p>
      <div className="mt-2.5 space-y-2">
        {sorted.map(([reason, count]) => (
          <div key={reason} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-[var(--color-text-secondary)]">
              {getReasonLabel(reason)}
            </span>
            <div className="h-1.5 flex-1 rounded-full bg-[var(--color-bg-tertiary)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary-400)] transition-all"
                style={{ width: `${Math.max((count / maxCount) * 100, 4)}%` }}
              />
            </div>
            <span className="w-6 text-right font-mono text-[10px] text-[var(--color-text-tertiary)]">
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// TimeSlotCard
// ============================================

interface TimeSlotCardProps {
  timeSlotAnalysis: TimeSlotAnalysis[]
}

function TimeSlotCard({ timeSlotAnalysis }: TimeSlotCardProps) {
  if (timeSlotAnalysis.length === 0) return null

  const lowest = timeSlotAnalysis.reduce(
    (min, slot) => (slot.completionRate < min.completionRate ? slot : min),
    timeSlotAnalysis[0]
  )

  const maxRate = Math.max(...timeSlotAnalysis.map((s) => s.completionRate), 1)
  const allSimilar =
    timeSlotAnalysis.length > 1 &&
    Math.max(...timeSlotAnalysis.map((s) => s.completionRate)) -
      Math.min(...timeSlotAnalysis.map((s) => s.completionRate)) <=
      15

  const insightMessage = allSimilar
    ? '시간대별로 고르게 해내고 있어요'
    : `${lowest.label}에서 어려움이 있었네요. 다른 시간대를 시도해볼까요?`

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
      <p className="mb-2.5 text-[11px] text-[var(--color-text-tertiary)]">{insightMessage}</p>
      <div className="space-y-2">
        {timeSlotAnalysis.map((slot) => {
          const isLowest = !allSimilar && slot.timeSlot === lowest.timeSlot
          return (
            <div key={slot.timeSlot} className="flex items-center gap-2">
              <span
                className={cn(
                  'w-24 shrink-0 text-xs',
                  isLowest
                    ? 'font-medium text-[var(--color-miss)]'
                    : 'text-[var(--color-text-secondary)]'
                )}
              >
                {slot.label}
              </span>
              <div className="h-1.5 flex-1 rounded-full bg-[var(--color-bg-tertiary)]">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    isLowest ? 'bg-[var(--color-miss-bg)]' : 'bg-[var(--color-done)]'
                  )}
                  style={{ width: `${Math.max((slot.completionRate / maxRate) * 100, 4)}%` }}
                />
              </div>
              <span className="w-8 text-right font-mono text-[10px] text-[var(--color-text-secondary)]">
                {slot.completionRate}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// SkipMissInsightCard
// ============================================

interface SkipMissInsightCardProps {
  skipMiss: SkipMissRatio
}

function SkipMissInsightCard({ skipMiss }: SkipMissInsightCardProps) {
  const { totalSkip, totalMiss, skipRate, missRate } = skipMiss

  if (totalSkip + totalMiss < 3) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
        <p className="text-xs text-[var(--color-text-tertiary)]">
          아직 데이터가 쌓이는 중이에요 🌱
        </p>
      </div>
    )
  }

  const total = totalSkip + totalMiss

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
      {/* Segmented bar */}
      <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
        {totalSkip > 0 && (
          <div
            className="h-full bg-[var(--color-text-tertiary)] transition-all"
            style={{ width: `${(totalSkip / total) * 100}%` }}
          />
        )}
        {totalMiss > 0 && (
          <div
            className="h-full bg-[var(--color-miss-bg)] transition-all"
            style={{ width: `${(totalMiss / total) * 100}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-[11px] text-[var(--color-text-tertiary)]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-text-tertiary)]" />
          건너뜀 {skipRate}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-miss-bg)]" />
          놓침 {missRate}%
        </span>
      </div>

      {/* Insight messages */}
      <div className="mt-2.5 space-y-1.5">
        {totalSkip > 0 && (
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            의도적 휴식이 {skipRate}%를 차지하네요. 쉬는 것도 전략이에요
          </p>
        )}
        {totalMiss > 0 && (
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            놓친 날이 {missRate}%예요. 알림이나 시간 변경이 도움될 수 있어요
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================
// ObstacleAnalysisSection
// ============================================

interface ObstacleAnalysisSectionProps {
  roadmapData: AreaReviewData[]
  checkInHistory: DayHistory[]
  startDate: string
  endDate: string
}

export function ObstacleAnalysisSection({
  roadmapData,
  checkInHistory,
  startDate,
  endDate,
}: ObstacleAnalysisSectionProps) {
  const { data, isLoading } = useObstacleAnalysis(roadmapData, checkInHistory, startDate, endDate)

  if (isLoading || !data) return null

  const hasReasons = data.reasonCounts.length > 0
  const hasTimeSlots = data.timeSlotAnalysis.length > 0
  const hasSkipMiss = data.skipMiss.totalSkip + data.skipMiss.totalMiss > 0

  if (!hasReasons && !hasTimeSlots && !hasSkipMiss) return null

  return (
    <section>
      {/* Header */}
      <div className="mb-2">
        <span className="mb-1.5 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
          🔍 막힘 분석
        </span>
        <p className="text-[11px] text-[var(--color-text-tertiary)]">
          어떤 패턴으로 막히는지 살펴봐요
        </p>
      </div>

      <div className="space-y-3">
        {hasReasons && <ReasonPatternCard reasonCounts={data.reasonCounts} />}
        {hasTimeSlots && <TimeSlotCard timeSlotAnalysis={data.timeSlotAnalysis} />}
        {hasSkipMiss && <SkipMissInsightCard skipMiss={data.skipMiss} />}
      </div>
    </section>
  )
}
