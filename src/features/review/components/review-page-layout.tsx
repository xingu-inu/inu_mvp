'use client'

import { useCallback, useMemo } from 'react'
import { parseISO } from 'date-fns'
import { motion } from 'framer-motion'
import { useReviewStore } from '@/stores/review.store'
import { useCheckInHistory } from '../hooks/use-checkin-history'
import { useMoodHistory } from '../hooks/use-mood-history'
import { useReviewRoadmapData } from '../hooks/use-review-roadmap-data'
import { useReviewPeriod } from '../hooks/use-review-period'
import { useReviewDirection } from '../hooks/use-review-direction'
import { useComparisonData } from '../hooks/use-comparison-data'
import { useAreaTrend } from '../hooks/use-area-trend'
import { useWeeklyReflection } from '../hooks/use-weekly-reflection'
import {
  computeOverviewStats,
  extractActiveStreaks,
  computeAreaBalance,
} from '../utils/timeline-utils'
import { generateInsightText, generateGrowthSummary } from '../utils/generate-insight'
import { CompactSummaryCard } from './compact-summary-card'
import { DailyHeatmap } from './daily-heatmap'
import { AreaList } from './area-list'
import { PanelContent } from './review-panel'
import { EmptyReview } from './empty-review'
import { ReviewSkeleton } from './review-skeleton'
import { ResponsiveModal, ModalBody } from '@/components/ui/responsive-modal'
import { useIsMobile } from '@/hooks/use-is-mobile'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Layout
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function ReviewPageLayout() {
  const { startDate, endDate, isWeek, period, periodLabel, weekStartDate } = useReviewPeriod()
  useReviewDirection()
  const selectedDate = useReviewStore((s) => s.selectedDate)
  const selectedAreaId = useReviewStore((s) => s.selectedAreaId)
  const panelMode = useReviewStore((s) => s.panelMode)
  const selectDay = useReviewStore((s) => s.selectDay)
  const selectArea = useReviewStore((s) => s.selectArea)
  const clearSelection = useReviewStore((s) => s.clearSelection)
  const isMobile = useIsMobile()

  // Data fetching
  const { data: checkInHistory, isLoading: l1 } = useCheckInHistory()
  const { data: moodHistory, isLoading: l2 } = useMoodHistory()
  const { data: roadmapData, isLoading: l3 } = useReviewRoadmapData()
  const { data: areaTrends = [] } = useAreaTrend()
  const { data: weeklyReflection } = useWeeklyReflection(isWeek ? weekStartDate : undefined)

  const isLoading = l1 || l2 || l3

  // Computed data
  const totalDays = useMemo(() => {
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }, [startDate, endDate])

  const overviewStats = useMemo(
    () => computeOverviewStats(checkInHistory, moodHistory, totalDays),
    [checkInHistory, moodHistory, totalDays]
  )

  const comparison = useComparisonData(
    overviewStats.completionRate,
    overviewStats.activeDays,
    moodHistory
  )

  const activeStreaks = useMemo(() => extractActiveStreaks(roadmapData), [roadmapData])
  const areaBalances = useMemo(() => computeAreaBalance(roadmapData), [roadmapData])

  const insightText = useMemo(
    () => generateInsightText(checkInHistory ?? [], period === 'month' ? 'month' : 'week'),
    [checkInHistory, period]
  )

  const growthText = useMemo(
    () => generateGrowthSummary(overviewStats.activeDays, totalDays),
    [overviewStats.activeDays, totalDays]
  )

  // Handlers
  const handleSelectDate = useCallback((date: string) => selectDay(date), [selectDay])

  const handleToggleDate = useCallback(
    (date: string) => {
      if (selectedDate === date) clearSelection()
      else selectDay(date)
    },
    [selectedDate, selectDay, clearSelection]
  )

  if (isLoading) return <ReviewSkeleton />

  const hasData = (checkInHistory?.length ?? 0) > 0 || (roadmapData?.length ?? 0) > 0
  if (!hasData) return <EmptyReview />

  return (
    <div className="flex h-full flex-col">
      {/* Main Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
        <motion.div
          className="space-y-4"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden"
          animate="show"
        >
          {/* ① Compact Summary */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.3 }}
          >
            <CompactSummaryCard
              stats={overviewStats}
              streaks={activeStreaks}
              comparison={comparison}
              moodHistory={moodHistory}
              areaBalances={areaBalances}
              isWeek={isWeek}
              periodLabel={periodLabel}
              weeklyReflection={isWeek ? weeklyReflection : null}
              growthMessage={[insightText, growthText].filter(Boolean).join(' ') || null}
            />
          </motion.div>

          {/* ③ Daily Heatmap */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.3 }}
          >
            <DailyHeatmap
              checkInHistory={checkInHistory ?? []}
              moodHistory={moodHistory ?? []}
              startDate={startDate}
              endDate={endDate}
              isWeek={isWeek}
              onSelectDate={isMobile ? handleToggleDate : handleSelectDate}
              selectedDate={selectedDate}
            />
          </motion.div>

          {/* ③ Area List */}
          {areaBalances.length > 0 && (
            <motion.div
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.3 }}
            >
              <AreaList
                areas={areaBalances}
                trends={areaTrends}
                roadmapData={roadmapData ?? []}
                selectedAreaId={selectedAreaId}
                onSelectArea={selectArea}
              />
            </motion.div>
          )}
        </motion.div>
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
