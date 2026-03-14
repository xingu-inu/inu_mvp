'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { format, isToday, isFuture, startOfDay, startOfWeek, isBefore, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Sparkles } from 'lucide-react'

import { usePanelDateStore } from '@/stores/panel-date.store'
import { useHomeTasks } from '@/queries/use-home'
import { useDirection } from '@/queries/use-direction'
import { calculateTaskStats, getContextualGreeting } from '@/lib/utils/task-utils'
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

const EVENING_HOUR = 18
const REFLECTION_THRESHOLD = 50

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
      {/* Header: month label + week/month toggle */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
        <h2 className="text-sm font-semibold">{format(selectedDate, 'yyyy. M', { locale: ko })}</h2>
        <FormSegmentedControl
          value={viewMode}
          onChange={(v) => setViewMode(v as 'week' | 'month')}
          options={VIEW_OPTIONS}
          compact
          layoutId="checkin-view-mode"
        />
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {viewMode === 'week' ? (
          <WeekContent selectedDate={selectedDate} onDateSelect={setSelectedDate} />
        ) : (
          <div className="p-4">
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
}: {
  selectedDate: Date
  onDateSelect: (date: Date) => void
}) {
  const { data: currentDirection } = useDirection()
  const directionId = currentDirection?.id
  const { data: tasks = [], isLoading } = useHomeTasks(selectedDate, directionId)
  const viewingToday = isToday(selectedDate)
  const viewingFuture = isFuture(startOfDay(selectedDate))

  // Read-only if viewing future dates or dates before the current direction was created
  const isOldDirectionDate = !!(
    currentDirection?.created_at &&
    isBefore(startOfDay(selectedDate), startOfDay(parseISO(currentDirection.created_at)))
  )
  const isReadOnly = viewingFuture || isOldDirectionDate
  const stats = useMemo(() => calculateTaskStats(tasks), [tasks])
  const setIsPriorityRankOpen = useHomeStore((s) => s.setIsPriorityRankOpen)

  // Google Calendar events
  const weekStartStr = format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')
  const { data: googleEvents = [] } = useGoogleCalendarEvents(weekStartStr)
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
  const dayGCalEvents = useMemo(
    () => googleEvents.filter((e) => e.dateStr === selectedDateStr),
    [googleEvents, selectedDateStr]
  )

  const showReflection = !viewingFuture
  const currentHour = new Date().getHours()
  const reflectionAbove =
    stats.isAllDone ||
    (viewingToday && currentHour >= EVENING_HOUR && stats.completionRate >= REFLECTION_THRESHOLD)

  return (
    <div className="flex flex-col">
      {/* Week strip */}
      <div className="px-4 pt-3">
        <CompactWeekStrip
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          directionId={directionId}
        />
      </div>

      {/* Contextual greeting + priority rank button */}
      {viewingToday && tasks.length > 0 && (
        <div className="flex items-center justify-between px-5 pt-3">
          <p className="text-xs text-[var(--color-text-secondary)]">
            {getContextualGreeting(tasks)}
          </p>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setIsPriorityRankOpen(true)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-ai)] px-3 py-2 text-xs font-medium text-white shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              우선순위 정리
            </button>
          )}
        </div>
      )}

      {/* Task list + reflection */}
      <div className="space-y-4 px-5 pt-3 pb-5">
        {isLoading ? (
          <PanelSkeleton />
        ) : (
          <>
            {showReflection && reflectionAbove && (
              <DailyReflectionCard tasks={tasks} date={selectedDate} />
            )}
            <TaskList
              tasks={tasks}
              isReadOnly={isReadOnly}
              selectedDate={selectedDate}
              enableAiSuggest={!isReadOnly}
              googleEvents={dayGCalEvents}
            />
            {showReflection && !reflectionAbove && (
              <DailyReflectionCard tasks={tasks} date={selectedDate} />
            )}
          </>
        )}
      </div>

      {/* Priority rank modal */}
      {!isReadOnly && <PriorityRankModal />}
    </div>
  )
}
