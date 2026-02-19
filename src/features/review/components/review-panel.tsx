'use client'

import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ArrowLeft } from 'lucide-react'
import { useReviewStore } from '@/stores/review.store'
import { ReviewPanelOverview } from './review-panel-overview'
import { JournalDayDetail } from './journal/journal-day-detail'
import { AreaBalanceDetail } from './overview/area-balance-detail'
import { GoalReviewDetail } from './overview/goal-review-detail'
import type { ReviewPanelMode } from '@/stores/review.store'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function usePanelHeader(): {
  title: string
  backLabel: string | null
  onBack: (() => void) | null
} {
  const panelMode = useReviewStore((s) => s.panelMode)
  const selectedDate = useReviewStore((s) => s.selectedDate)
  const selectedAreaId = useReviewStore((s) => s.selectedAreaId)
  const selectedGoalId = useReviewStore((s) => s.selectedGoalId)
  const roadmapData = useReviewStore((s) => s.roadmapData)
  const goBackToOverview = useReviewStore((s) => s.goBackToOverview)
  const goBackToArea = useReviewStore((s) => s.goBackToArea)

  return useMemo(() => {
    switch (panelMode) {
      case 'overview':
        return { title: '날짜별 기록', backLabel: null, onBack: null }

      case 'day-detail': {
        let dateLabel = ''
        if (selectedDate) {
          try {
            dateLabel = format(parseISO(selectedDate), 'M월 d일', { locale: ko })
          } catch {
            dateLabel = selectedDate
          }
        }
        return { title: dateLabel, backLabel: '뒤로', onBack: goBackToOverview }
      }

      case 'area-detail': {
        let areaLabel = ''
        if (selectedAreaId) {
          const areaData = roadmapData.find((a) => a.area.id === selectedAreaId)
          if (areaData) {
            areaLabel = `${areaData.area.emoji} ${areaData.area.name}`
          }
        }
        return { title: areaLabel, backLabel: '뒤로', onBack: goBackToOverview }
      }

      case 'goal-detail': {
        let goalLabel = ''
        if (selectedGoalId) {
          for (const areaData of roadmapData) {
            const goalData = areaData.goals.find((g) => g.goal.id === selectedGoalId)
            if (goalData) {
              goalLabel = `🎯 ${goalData.goal.name}`
              break
            }
          }
        }
        return { title: goalLabel, backLabel: '영역으로', onBack: goBackToArea }
      }

      default:
        return { title: '', backLabel: null, onBack: null }
    }
  }, [
    panelMode,
    selectedDate,
    selectedAreaId,
    selectedGoalId,
    roadmapData,
    goBackToOverview,
    goBackToArea,
  ])
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Panel Content
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PanelContent({ mode }: { mode: ReviewPanelMode }) {
  const selectedDate = useReviewStore((s) => s.selectedDate)
  const selectedAreaId = useReviewStore((s) => s.selectedAreaId)
  const selectedGoalId = useReviewStore((s) => s.selectedGoalId)

  switch (mode) {
    case 'overview':
      return <ReviewPanelOverview />

    case 'day-detail':
      if (!selectedDate) return null
      return <JournalDayDetail dateStr={selectedDate} />

    case 'area-detail':
      if (!selectedAreaId) return null
      return (
        <div className="px-6 py-4">
          <AreaBalanceDetail areaId={selectedAreaId} />
        </div>
      )

    case 'goal-detail':
      if (!selectedGoalId) return null
      return (
        <div className="px-6 py-4">
          <GoalReviewDetail goalId={selectedGoalId} />
        </div>
      )

    default:
      return null
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function ReviewPanel() {
  const panelMode = useReviewStore((s) => s.panelMode)
  const { title, backLabel, onBack } = usePanelHeader()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-5 py-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{backLabel}</span>
          </button>
        ) : null}
        {title && (
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {title}
          </h3>
        )}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PanelContent mode={panelMode} />
      </div>
    </div>
  )
}
