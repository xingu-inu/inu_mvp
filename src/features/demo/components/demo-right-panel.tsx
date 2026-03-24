'use client'

import { useState } from 'react'
import { isToday, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar } from 'lucide-react'
import { useDemoMode } from '@/lib/demo/demo-context'
import { usePanelDateStore } from '@/stores/panel-date.store'
import { useHomeTasks } from '@/queries/use-home'
import { getContextualGreeting } from '@/lib/utils/task-utils'
import { TaskList } from '@/features/home/components/task-list'
import { GoalBrowsePanel } from '@/features/roadmap/components/panel-modes'
import { ReviewPanel } from '@/features/review/components/review-panel'
import { FormSegmentedControl } from '@/components/ui/form-segmented-control'

const PANEL_TAB_OPTIONS = [
  { value: 'roadmap', label: '로드맵' },
  { value: 'checkin', label: '체크인' },
]

export function DemoRightPanel() {
  const { activeTab } = useDemoMode()

  if (activeTab === 'review') {
    return <ReviewPanel />
  }

  return <DemoRoadmapPanelWithToggle />
}

/** Mirrors the logged-in DateTaskPanel's roadmap/checkin toggle */
function DemoRoadmapPanelWithToggle() {
  const [rightPanelTab, setRightPanelTab] = useState<'roadmap' | 'checkin'>('roadmap')

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] px-4 py-2.5">
        <FormSegmentedControl
          value={rightPanelTab}
          onChange={(v) => setRightPanelTab(v as 'roadmap' | 'checkin')}
          options={PANEL_TAB_OPTIONS}
          compact
          layoutId="demo-right-panel-tab"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {rightPanelTab === 'checkin' ? <DemoCheckinPanel /> : <GoalBrowsePanel />}
      </div>
    </div>
  )
}

/** Simplified check-in panel for demo mode (read-only) */
function DemoCheckinPanel() {
  const selectedDate = usePanelDateStore((s) => s.selectedDate)
  const { data: tasks = [], isLoading } = useHomeTasks(selectedDate)
  const viewingToday = isToday(selectedDate)
  const dateLabel = format(selectedDate, 'M월 d일 EEEE', { locale: ko })

  return (
    <div className="flex h-full flex-col">
      {/* Date header */}
      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            <h2 className="text-sm font-semibold">{dateLabel}</h2>
          </div>
          {viewingToday && tasks.length > 0 && (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {getContextualGreeting(tasks)}
            </p>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-5">
        {isLoading ? (
          <DemoPanelSkeleton />
        ) : (
          <TaskList tasks={tasks} isReadOnly selectedDate={selectedDate} enableAiSuggest={false} />
        )}
      </div>
    </div>
  )
}

function DemoPanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
      <div className="h-16 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
      <div className="h-16 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
    </div>
  )
}
