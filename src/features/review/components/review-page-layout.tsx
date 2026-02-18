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
import { AchievementHero, AreaBalanceBars } from './overview'
import { AiReviewInsightCard } from './overview/ai-review-insight-card'
import { AreaTrendSparklines } from './overview/area-trend-sparklines'
import { MoodTrendChart } from './overview/mood-trend-chart'
import { PeriodComparisonStrip } from './overview/period-comparison-strip'
import { useComparisonData } from '../hooks/use-comparison-data'
import { JournalHeatmap } from './journal/journal-heatmap'
import { JournalDayDetail } from './journal/journal-day-detail'
import { PeriodReflectionSection } from './period-reflection/period-reflection-section'
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

  // Heatmap date selection (desktop → panel, mobile → toggle inline)
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
    overviewStats,
  }

  return (
    <div className="flex h-full flex-col">
      {/* Desktop layout — compact, 2-column grid */}
      <div className="hidden h-full lg:block">
        <div className="h-full space-y-4 overflow-y-auto p-4 lg:p-5">
          {/* Hero: horizontal ring + narrative */}
          <AchievementHero
            stats={overviewStats}
            streaks={activeStreaks}
            checkInHistory={checkInHistory ?? []}
            totalDays={totalDays}
            period={period}
          />

          <PeriodComparisonStrip comparison={comparison} isWeek={isWeek} />

          <MoodTrendChart moodHistory={moodHistory} />

          <JournalHeatmap
            checkInHistory={checkInHistory ?? []}
            startDate={startDate}
            endDate={endDate}
            isWeek={isWeek}
            onSelectDate={handleSelectDate}
            selectedDate={selectedDate}
          />
          {areaBalances.length > 0 && (
            <AreaBalanceBars
              areas={areaBalances}
              selectedAreaId={selectedAreaId}
              onSelectArea={selectArea}
              expandedAreaId={null}
              onToggleArea={() => {}}
            />
          )}

          <AreaTrendSparklines />

          {/* AI Insight — only for current roadmap version */}
          {isCurrentVersion && (
            <AiReviewInsightCard
              overviewStats={overviewStats}
              activeStreaks={activeStreaks}
              areaBalances={areaBalances}
              moodHistory={moodHistory}
              isWeek={isWeek}
              periodLabel={reflectionLabel}
              weeklyReflection={weeklyReflection}
            />
          )}

          {/* Reflection — only for current roadmap version */}
          {isCurrentVersion && <PeriodReflectionSection {...reflectionProps} />}
        </div>
      </div>

      {/* Mobile layout — single column, tighter spacing */}
      <div className="space-y-4 overflow-y-auto p-4 pb-8 lg:hidden">
        <AchievementHero
          stats={overviewStats}
          streaks={activeStreaks}
          checkInHistory={checkInHistory ?? []}
          totalDays={totalDays}
          period={period}
        />

        <PeriodComparisonStrip comparison={comparison} isWeek={isWeek} />

        <MoodTrendChart moodHistory={moodHistory} />

        <JournalHeatmap
          checkInHistory={checkInHistory ?? []}
          startDate={startDate}
          endDate={endDate}
          isWeek={isWeek}
          onSelectDate={handleToggleDate}
          selectedDate={selectedDate}
        />
        {areaBalances.length > 0 && (
          <AreaBalanceBars
            areas={areaBalances}
            selectedAreaId={null}
            onSelectArea={() => {}}
            expandedAreaId={expandedAreaId}
            onToggleArea={handleToggleArea}
          />
        )}

        <AreaTrendSparklines />

        {/* Inline day detail for mobile */}
        {selectedDate && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
            <JournalDayDetail dateStr={selectedDate} />
          </div>
        )}
        {/* AI Insight — only for current roadmap version */}
        {isCurrentVersion && (
          <AiReviewInsightCard
            overviewStats={overviewStats}
            activeStreaks={activeStreaks}
            areaBalances={areaBalances}
            moodHistory={moodHistory}
            isWeek={isWeek}
            periodLabel={reflectionLabel}
            weeklyReflection={weeklyReflection}
          />
        )}

        {/* Reflection — only for current roadmap version */}
        {isCurrentVersion && <PeriodReflectionSection {...reflectionProps} />}
      </div>
    </div>
  )
}
