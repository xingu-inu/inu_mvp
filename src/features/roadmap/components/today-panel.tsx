'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { format, isFuture, startOfDay, startOfWeek, isBefore, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

import { usePanelDateStore } from '@/stores/panel-date.store'
import { useHomeTasks } from '@/queries/use-home'
import { useDirection } from '@/queries/use-direction'
import { TaskList } from '@/features/home/components/task-list'
import { DailyReflectionCard } from '@/features/home/components/daily-reflection-card'
import { TaskDetailPanel } from '@/features/home/components/panel-modes/task-detail-panel'
import { HomeGoalView } from '@/features/home/components/panel-modes/home-goal-view'
import { CompactWeekStrip } from '@/features/home/components/compact-week-strip'
import { UnifiedCalendar } from '@/features/home/components/unified-calendar'
import { FormSegmentedControl } from '@/components/ui/form-segmented-control'
import { useGoogleCalendarEvents } from '@/queries/use-google-calendar-events'
import { useHomeStore } from '@/stores/home.store'

const PriorityRankModal = dynamic(
  () =>
    import('@/features/home/components/priority-rank-modal').then((m) => ({
      default: m.PriorityRankModal,
    })),
  { ssr: false }
)

const VIEW_OPTIONS = [
  { value: 'week', label: '주' },
  { value: 'month', label: '월' },
]

function PanelSkeleton() {
  return (
    <div className="space-y-4 p-5">
      <div className="h-12 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
      <div className="h-16 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
      <div className="h-16 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
    </div>
  )
}

export function TodayPanel() {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const selectedDate = usePanelDateStore((s) => s.selectedDate)
  const setSelectedDate = usePanelDateStore((s) => s.setSelectedDate)
  const panelMode = useHomeStore((s) => s.panelMode)

  // Delegate to sub-panels for task-detail and goal-view modes
  if (panelMode === 'task-detail') {
    return <TaskDetailPanel />
  }
  if (panelMode === 'goal-view') {
    return <HomeGoalView />
  }

  const handleMonthDayClick = (date: Date) => {
    setSelectedDate(date)
    setViewMode('week') // switch to week view to show daily tasks
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {viewMode === 'week' ? (
          <WeekContent
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        ) : (
          <div className="p-4">
            {/* Month label + view toggle above calendar */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--color-text-tertiary)]">
                {format(selectedDate, 'yyyy. M', { locale: ko })}
              </p>
              <FormSegmentedControl
                value={viewMode}
                onChange={(v) => setViewMode(v as 'week' | 'month')}
                options={VIEW_OPTIONS}
                compact
                layoutId="checkin-view-mode"
              />
            </div>
            <UnifiedCalendar selectedDate={selectedDate} onDateSelect={handleMonthDayClick} />
          </div>
        )}
      </div>
    </div>
  )
}

function WeekContent({
  selectedDate,
  onDateSelect,
  viewMode,
  onViewModeChange,
}: {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  viewMode: 'week' | 'month'
  onViewModeChange: (mode: 'week' | 'month') => void
}) {
  const { data: currentDirection } = useDirection()
  const directionId = currentDirection?.id
  const { data: tasks = [], isLoading } = useHomeTasks(selectedDate, directionId)
  const viewingFuture = isFuture(startOfDay(selectedDate))

  // Read-only if viewing future dates or dates before the current direction was created
  const isOldDirectionDate = !!(
    currentDirection?.created_at &&
    isBefore(startOfDay(selectedDate), startOfDay(parseISO(currentDirection.created_at)))
  )
  const isReadOnly = viewingFuture || isOldDirectionDate

  // Google Calendar events
  const weekStartStr = format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')
  const { data: googleEvents = [] } = useGoogleCalendarEvents(weekStartStr)
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
  const dayGCalEvents = useMemo(
    () => googleEvents.filter((e) => e.dateStr === selectedDateStr),
    [googleEvents, selectedDateStr]
  )

  const showReflection = !viewingFuture

  return (
    <div className="flex flex-col">
      {/* Month label + view toggle + Week strip */}
      <div className="px-4 pt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-medium text-[var(--color-text-tertiary)]">
            {format(selectedDate, 'yyyy. M', { locale: ko })}
          </p>
          <FormSegmentedControl
            value={viewMode}
            onChange={(v) => onViewModeChange(v as 'week' | 'month')}
            options={VIEW_OPTIONS}
            compact
            layoutId="checkin-view-mode"
          />
        </div>
        <CompactWeekStrip
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          directionId={directionId}
        />
      </div>

      {/* Reflection — right below week strip */}
      {showReflection && (
        <div className="px-5 pt-2">
          <DailyReflectionCard tasks={tasks} date={selectedDate} />
        </div>
      )}

      {/* Task list */}
      <div className="space-y-4 px-5 pt-3 pb-5">
        {isLoading ? (
          <PanelSkeleton />
        ) : (
          <TaskList
            tasks={tasks}
            isReadOnly={isReadOnly}
            selectedDate={selectedDate}
            enableAiSuggest={!isReadOnly}
            googleEvents={dayGCalEvents}
          />
        )}
      </div>

      {/* Priority rank modal */}
      {!isReadOnly && <PriorityRankModal />}
    </div>
  )
}
