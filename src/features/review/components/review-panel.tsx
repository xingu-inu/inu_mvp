'use client'

import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ArrowLeft, MousePointerClick } from 'lucide-react'
import { useReviewStore } from '@/stores/review.store'
import { useReviewRoadmapData } from '../hooks/use-review-roadmap-data'
import { JournalDayDetail } from './journal/journal-day-detail'
import { AreaHistoryPanel } from './area-history-panel'
import { GoalReviewDetail } from './overview/goal-review-detail'
import type { ReviewPanelMode } from '@/stores/review.store'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Empty State
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ReviewPanelEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-tertiary)]">
        <MousePointerClick className="h-5 w-5 text-[var(--color-text-tertiary)]" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          왼쪽에서 항목을 선택해보세요
        </p>
        <div className="space-y-0.5 text-xs text-[var(--color-text-tertiary)]">
          <p>📅 날짜 → 일일 기록</p>
          <p>💪 영역 → 이력 보기</p>
        </div>
      </div>
    </div>
  )
}

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
  const goBackToEmpty = useReviewStore((s) => s.goBackToEmpty)
  const goBackToArea = useReviewStore((s) => s.goBackToArea)
  const { data: roadmapData = [] } = useReviewRoadmapData()

  return useMemo(() => {
    switch (panelMode) {
      case 'empty':
        return { title: '', backLabel: null, onBack: null }

      case 'day-detail': {
        let dateLabel = ''
        if (selectedDate) {
          try {
            dateLabel = format(parseISO(selectedDate), 'M월 d일', { locale: ko })
          } catch {
            dateLabel = selectedDate
          }
        }
        return { title: dateLabel, backLabel: '뒤로', onBack: goBackToEmpty }
      }

      case 'area-detail': {
        let areaLabel = ''
        if (selectedAreaId) {
          const areaData = roadmapData.find((a) => a.area.id === selectedAreaId)
          if (areaData) {
            areaLabel = `${areaData.area.emoji} ${areaData.area.name}`
          }
        }
        return { title: areaLabel, backLabel: '뒤로', onBack: goBackToEmpty }
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
    goBackToEmpty,
    goBackToArea,
  ])
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Panel Content
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function PanelContent({ mode }: { mode: ReviewPanelMode }) {
  const selectedDate = useReviewStore((s) => s.selectedDate)
  const selectedAreaId = useReviewStore((s) => s.selectedAreaId)
  const selectedGoalId = useReviewStore((s) => s.selectedGoalId)

  switch (mode) {
    case 'empty':
      return <ReviewPanelEmpty />

    case 'day-detail':
      if (!selectedDate) return null
      return <JournalDayDetail dateStr={selectedDate} />

    case 'area-detail':
      if (!selectedAreaId) return null
      return <AreaHistoryPanel areaId={selectedAreaId} />

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
      {panelMode !== 'empty' && (
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
      )}

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PanelContent mode={panelMode} />
      </div>
    </div>
  )
}
