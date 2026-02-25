'use client'

import { useMemo, useCallback, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { useReviewStore } from '@/stores/review.store'
import {
  computeOverviewStats,
  extractActiveStreaks,
  computeAreaBalance,
} from '@/features/review/utils/timeline-utils'
import { CompactSummaryCard } from '@/features/review/components/compact-summary-card'
import { DailyHeatmap } from '@/features/review/components/daily-heatmap'
import { AreaList } from '@/features/review/components/area-list'
import { PanelContent } from '@/features/review/components/review-panel'
import { ResponsiveModal, ModalBody } from '@/components/ui/responsive-modal'
import { useIsMobile } from '@/hooks/use-is-mobile'
import {
  generateDemoCheckInHistory,
  generateDemoMoodHistory,
  generateDemoRoadmapData,
  generateDemoAreaTrends,
} from '@/lib/demo/review-data'

export function DemoReviewContent() {
  const selectedDate = useReviewStore((s) => s.selectedDate)
  const selectedAreaId = useReviewStore((s) => s.selectedAreaId)
  const panelMode = useReviewStore((s) => s.panelMode)
  const selectDay = useReviewStore((s) => s.selectDay)
  const selectArea = useReviewStore((s) => s.selectArea)
  const clearSelection = useReviewStore((s) => s.clearSelection)
  const setRoadmapData = useReviewStore((s) => s.setRoadmapData)
  const isMobile = useIsMobile()

  // Generate demo data with a fixed date range (last 30 days)
  const endDate = format(new Date(), 'yyyy-MM-dd')
  const startDate = format(subDays(new Date(), 29), 'yyyy-MM-dd')

  const checkInHistory = useMemo(
    () => generateDemoCheckInHistory(startDate, endDate),
    [startDate, endDate]
  )
  const moodHistory = useMemo(
    () => generateDemoMoodHistory(startDate, endDate),
    [startDate, endDate]
  )
  const roadmapData = useMemo(() => generateDemoRoadmapData(), [])
  const areaTrends = useMemo(() => generateDemoAreaTrends(), [])

  // Sync roadmapData to review store so ReviewPanel can read it for panel headers
  useEffect(() => {
    setRoadmapData(roadmapData)
  }, [roadmapData, setRoadmapData])

  const totalDays = 30

  const overviewStats = useMemo(
    () => computeOverviewStats(checkInHistory, moodHistory, totalDays),
    [checkInHistory, moodHistory]
  )

  const activeStreaks = useMemo(() => extractActiveStreaks(roadmapData), [roadmapData])
  const areaBalances = useMemo(() => computeAreaBalance(roadmapData), [roadmapData])

  const handleSelectDate = useCallback((date: string) => selectDay(date), [selectDay])
  const handleToggleDate = useCallback(
    (date: string) => {
      if (selectedDate === date) clearSelection()
      else selectDay(date)
    },
    [selectedDate, selectDay, clearSelection]
  )

  return (
    <div className="flex h-full flex-col">
      {/* Main Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
        <div className="space-y-4">
          {/* Compact Summary */}
          <CompactSummaryCard
            stats={overviewStats}
            streaks={activeStreaks}
            comparison={{
              prevCompletionRate: 0,
              currentCompletionRate: overviewStats.completionRate,
              completionDelta: 0,
              prevActiveDays: 0,
              currentActiveDays: overviewStats.activeDays,
              activeDaysDelta: 0,
              prevAvgMood: null,
              currentAvgMood: null,
              moodDelta: null,
              hasPrevData: false,
            }}
            moodHistory={moodHistory}
            areaBalances={areaBalances}
            isWeek={false}
            periodLabel="최근 30일"
          />

          {/* Daily Heatmap */}
          <DailyHeatmap
            checkInHistory={checkInHistory}
            moodHistory={moodHistory}
            startDate={startDate}
            endDate={endDate}
            isWeek={false}
            onSelectDate={isMobile ? handleToggleDate : handleSelectDate}
            selectedDate={selectedDate}
          />

          {/* Area List */}
          {areaBalances.length > 0 && (
            <AreaList
              areas={areaBalances}
              trends={areaTrends}
              roadmapData={roadmapData}
              selectedAreaId={selectedAreaId}
              onSelectArea={selectArea}
            />
          )}
        </div>
      </div>

      {/* Mobile drawer for detail panels */}
      {isMobile && panelMode !== 'empty' && (
        <ResponsiveModal
          open
          onOpenChange={(open) => {
            if (!open) clearSelection()
          }}
          title={
            panelMode === 'day-detail'
              ? '일일 기록'
              : panelMode === 'area-detail'
                ? '영역 이력'
                : panelMode === 'goal-detail'
                  ? '목표 상세'
                  : ''
          }
          forceMode="drawer"
        >
          <ModalBody className="px-4 pb-6">
            <PanelContent mode={panelMode} />
          </ModalBody>
        </ResponsiveModal>
      )}
    </div>
  )
}
