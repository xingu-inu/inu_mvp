'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useReviewStore } from '@/stores/review.store'
import { useCheckInHistory } from '../hooks/use-checkin-history'
import { useMoodHistory } from '../hooks/use-mood-history'
import { useReviewRoadmapData } from '../hooks/use-review-roadmap-data'
import { useReviewPeriod } from '../hooks/use-review-period'
import { useActivityLog } from '../hooks/use-activity-log'
import { useReviewDirection } from '../hooks/use-review-direction'
import { useWeeklyReflection, useSaveWeeklyReflection } from '../hooks/use-weekly-reflection'
import { useMonthlyReflection, useSaveMonthlyReflection } from '../hooks/use-monthly-reflection'
import {
  computeOverviewStats,
  extractActiveStreaks,
  computeAreaBalance,
  groupEventsByArea,
} from '../utils/timeline-utils'
import { useComparisonData } from '../hooks/use-comparison-data'
import { useAreaTrend } from '../hooks/use-area-trend'
import { AchievementHero } from './overview'
import { AreaBalanceUnified } from './overview/area-balance-unified'
import { AiReviewInsightModal } from './overview/ai-review-insight-modal'
import { JournalDayDetail } from './journal/journal-day-detail'
import { PeriodReflectionSection } from './period-reflection/period-reflection-section'
import { ReviewDayList } from './records/review-day-list'
import { MilestoneSection } from './overview/milestone-cards'
import { WhyTemperatureSection } from './overview/why-temperature-check'
import { ObstacleAnalysisSection } from './overview/obstacle-analysis'
import { EmptyReview } from './empty-review'
import { ReviewSkeleton } from './review-skeleton'

export function ReviewPageLayout() {
  const { startDate, endDate, isWeek, periodLabel, weekStartDate } = useReviewPeriod()
  const { isCurrentVersion } = useReviewDirection()
  const selectedDate = useReviewStore((s) => s.selectedDate)
  const selectedAreaId = useReviewStore((s) => s.selectedAreaId)
  const selectDay = useReviewStore((s) => s.selectDay)
  const selectArea = useReviewStore((s) => s.selectArea)
  const clearSelection = useReviewStore((s) => s.clearSelection)

  // Data fetching
  const { data: checkInHistory, isLoading: l1 } = useCheckInHistory()
  const { data: moodHistory, isLoading: l2 } = useMoodHistory()
  const { data: roadmapData, isLoading: l3 } = useReviewRoadmapData()
  const { data: activityEvents = [] } = useActivityLog()
  const { data: areaTrends = [] } = useAreaTrend()

  // Weekly/Monthly reflection
  const { data: weeklyReflection } = useWeeklyReflection(isWeek ? weekStartDate : undefined)
  const { mutate: saveWeekly, isPending: isSavingWeekly } = useSaveWeeklyReflection(
    isWeek ? weekStartDate : undefined
  )
  const monthStart = !isWeek ? format(parseISO(startDate), 'yyyy-MM-dd') : undefined
  const { data: monthlyReflection } = useMonthlyReflection(monthStart)
  const { mutate: saveMonthly, isPending: isSavingMonthly } = useSaveMonthlyReflection(monthStart)

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

  const areaChanges = useMemo(
    () => groupEventsByArea(activityEvents, roadmapData),
    [activityEvents, roadmapData]
  )

  // Sync to store for panel access
  const setAreaChanges = useReviewStore((s) => s.setAreaChanges)
  const setRoadmapData = useReviewStore((s) => s.setRoadmapData)
  useEffect(() => {
    setAreaChanges(areaChanges)
  }, [areaChanges, setAreaChanges])
  useEffect(() => {
    if (roadmapData) setRoadmapData(roadmapData)
  }, [roadmapData, setRoadmapData])

  // Mobile accordion state for areas
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null)
  const handleToggleArea = useCallback((areaId: string) => {
    setExpandedAreaId((prev) => (prev === areaId ? null : areaId))
  }, [])

  // Date selection (desktop → panel, mobile → toggle inline)
  const handleSelectDate = useCallback(
    (date: string) => {
      selectDay(date)
    },
    [selectDay]
  )

  const handleToggleDate = useCallback(
    (date: string) => {
      if (selectedDate === date) {
        clearSelection()
      } else {
        selectDay(date)
      }
    },
    [selectedDate, selectDay, clearSelection]
  )

  if (isLoading) return <ReviewSkeleton />

  const hasData = (checkInHistory?.length ?? 0) > 0 || (roadmapData?.length ?? 0) > 0
  if (!hasData) return <EmptyReview />

  const period = isWeek ? ('week' as const) : ('month' as const)
  const reflectionLabel = isWeek ? '이번 주' : periodLabel

  const reflectionProps = {
    isWeek,
    periodLabel: reflectionLabel,
    weeklyReflection,
    onSaveWeekly: saveWeekly,
    isSavingWeekly,
    monthlyReflection,
    onSaveMonthly: saveMonthly,
    isSavingMonthly,
  }

  return (
    <div className="flex h-full flex-col">
      {/* ═══ Desktop layout ═══ */}
      <div className="hidden h-full lg:block">
        <div className="h-full space-y-4 overflow-y-auto p-4 lg:p-5">
          {/* ACT 1: At a Glance + AI button */}
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <AchievementHero
                stats={overviewStats}
                streaks={activeStreaks}
                checkInHistory={checkInHistory ?? []}
                totalDays={totalDays}
                period={period}
                comparison={comparison}
              />
            </div>
            {isCurrentVersion && (
              <div className="shrink-0 pt-1">
                <AiReviewInsightModal
                  overviewStats={overviewStats}
                  activeStreaks={activeStreaks}
                  areaBalances={areaBalances}
                  moodHistory={moodHistory}
                  isWeek={isWeek}
                  periodLabel={reflectionLabel}
                  weeklyReflection={weeklyReflection}
                />
              </div>
            )}
          </div>

          {/* ACT 1.5: Milestones & Growth */}
          <MilestoneSection
            roadmapData={roadmapData ?? []}
            activityEvents={activityEvents}
            comparison={comparison}
            period={period}
            startDate={startDate}
            endDate={endDate}
          />

          {/* ACT 2: Areas (left) + Records (right) side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              {areaBalances.length > 0 && (
                <AreaBalanceUnified
                  areas={areaBalances}
                  trends={areaTrends}
                  selectedAreaId={selectedAreaId}
                  onSelectArea={selectArea}
                  expandedAreaId={null}
                  onToggleArea={() => {}}
                />
              )}
            </div>
            <div className="min-w-0">
              <ReviewDayList
                checkInHistory={checkInHistory ?? []}
                moodHistory={moodHistory ?? []}
                startDate={startDate}
                endDate={endDate}
                onSelectDate={handleSelectDate}
                selectedDate={selectedDate}
              />
            </div>
          </div>

          {/* ACT 3: Reflect */}
          {isCurrentVersion && <PeriodReflectionSection {...reflectionProps} />}
          {!isCurrentVersion && (
            <p className="rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2 text-center text-xs text-[var(--color-text-tertiary)]">
              회고 작성은 현재 로드맵에서만 가능합니다
            </p>
          )}

          {/* ACT 4: Why Temperature Check */}
          {isCurrentVersion && <WhyTemperatureSection roadmapData={roadmapData ?? []} />}

          {/* ACT 5: Obstacle Analysis */}
          {isCurrentVersion && (
            <ObstacleAnalysisSection
              roadmapData={roadmapData ?? []}
              checkInHistory={checkInHistory ?? []}
              startDate={startDate}
              endDate={endDate}
            />
          )}
        </div>
      </div>

      {/* ═══ Mobile layout ═══ */}
      <div className="space-y-4 overflow-y-auto p-4 pb-8 lg:hidden">
        {/* ACT 1: At a Glance + AI button */}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <AchievementHero
              stats={overviewStats}
              streaks={activeStreaks}
              checkInHistory={checkInHistory ?? []}
              totalDays={totalDays}
              period={period}
              comparison={comparison}
            />
          </div>
          {isCurrentVersion && (
            <div className="shrink-0 pt-1">
              <AiReviewInsightModal
                overviewStats={overviewStats}
                activeStreaks={activeStreaks}
                areaBalances={areaBalances}
                moodHistory={moodHistory}
                isWeek={isWeek}
                periodLabel={reflectionLabel}
                weeklyReflection={weeklyReflection}
              />
            </div>
          )}
        </div>

        {/* Records — horizontal cards with mood trend */}
        <ReviewDayList
          checkInHistory={checkInHistory ?? []}
          moodHistory={moodHistory ?? []}
          startDate={startDate}
          endDate={endDate}
          onSelectDate={handleToggleDate}
          selectedDate={selectedDate}
        />

        {/* Inline day detail (when date selected) */}
        {selectedDate && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
            <JournalDayDetail dateStr={selectedDate} />
          </div>
        )}

        {/* ACT 1.5: Milestones & Growth */}
        <MilestoneSection
          roadmapData={roadmapData ?? []}
          activityEvents={activityEvents}
          comparison={comparison}
          period={period}
          startDate={startDate}
          endDate={endDate}
        />

        {/* Areas */}
        {areaBalances.length > 0 && (
          <AreaBalanceUnified
            areas={areaBalances}
            trends={areaTrends}
            selectedAreaId={null}
            onSelectArea={() => {}}
            expandedAreaId={expandedAreaId}
            onToggleArea={handleToggleArea}
          />
        )}

        {/* ACT 3: Reflect */}
        {isCurrentVersion && <PeriodReflectionSection {...reflectionProps} />}
        {!isCurrentVersion && (
          <p className="rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2 text-center text-xs text-[var(--color-text-tertiary)]">
            회고 작성은 현재 로드맵에서만 가능합니다
          </p>
        )}

        {/* ACT 4: Why Temperature Check */}
        {isCurrentVersion && <WhyTemperatureSection roadmapData={roadmapData ?? []} />}

        {/* ACT 5: Obstacle Analysis */}
        {isCurrentVersion && (
          <ObstacleAnalysisSection
            roadmapData={roadmapData ?? []}
            checkInHistory={checkInHistory ?? []}
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </div>
    </div>
  )
}
