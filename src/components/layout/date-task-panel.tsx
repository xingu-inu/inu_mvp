'use client'

import { usePathname } from 'next/navigation'
import { Stethoscope, Sparkles } from 'lucide-react'
import { isToday } from 'date-fns'

import { useRoadmapStore, selectPanelMode, selectRightPanelTab } from '@/stores/roadmap.store'
import { GoalBrowsePanel } from '@/features/roadmap/components/panel-modes'
import { GroupEditForm, GroupCreateForm } from '@/features/roadmap'
import { ReviewPanel } from '@/features/review/components/review-panel'
import { TodayPanel } from '@/features/roadmap/components/today-panel'
import { FormSegmentedControl } from '@/components/ui/form-segmented-control'
import { AiActionButton } from '@/components/ui/ai-action-button'
import { useDemoMode } from '@/lib/demo/demo-context'
import { useHomeStore } from '@/stores/home.store'
import { usePanelDateStore } from '@/stores/panel-date.store'

const PANEL_TAB_OPTIONS = [
  { value: 'roadmap', label: '로드맵' },
  { value: 'checkin', label: '체크인' },
]

/** Roadmap right panel — routes by panelMode */
function RoadmapPanel() {
  const panelMode = useRoadmapStore(selectPanelMode)

  switch (panelMode) {
    case 'edit-group':
      return <GroupEditForm />
    case 'create-group':
      return <GroupCreateForm />
    default:
      return <GoalBrowsePanel />
  }
}

/** Derive the main tab from pathname */
function useMainTab(): 'roadmap' | 'review' {
  const pathname = usePathname()
  if (pathname.startsWith('/review')) return 'review'
  return 'roadmap'
}

/** AI action buttons for roadmap tab */
function RoadmapActions() {
  const { isDemoMode } = useDemoMode()
  const setIsDiagnosisOpen = useRoadmapStore((s) => s.setIsDiagnosisOpen)
  const setIsBrainDumpOpen = useRoadmapStore((s) => s.setIsBrainDumpOpen)

  if (isDemoMode) return null

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setIsDiagnosisOpen(true)}
        className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-[var(--color-primary-200)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-primary-500)] transition-colors hover:bg-[var(--color-primary-50)] active:scale-[0.97]"
      >
        <Stethoscope className="h-3.5 w-3.5" />
        진단
      </button>
      <AiActionButton
        onClick={() => setIsBrainDumpOpen(true)}
        icon={<Sparkles className="h-3.5 w-3.5" />}
      >
        쏟아내기
      </AiActionButton>
    </div>
  )
}

/** AI action button for checkin tab — priority rank */
function CheckinActions() {
  const { isDemoMode } = useDemoMode()
  const selectedDate = usePanelDateStore((s) => s.selectedDate)
  const setIsPriorityRankOpen = useHomeStore((s) => s.setIsPriorityRankOpen)

  // Only show for today and non-demo mode
  if (isDemoMode || !isToday(selectedDate)) return null

  return (
    <AiActionButton
      onClick={() => setIsPriorityRankOpen(true)}
      icon={<Sparkles className="h-3.5 w-3.5" />}
    >
      우선순위 정리
    </AiActionButton>
  )
}

function RoadmapPanelWithToggle() {
  const rightPanelTab = useRoadmapStore(selectRightPanelTab)
  const setRightPanelTab = useRoadmapStore((s) => s.setRightPanelTab)

  return (
    <div className="flex h-full flex-col">
      {/* Unified header: left = tab toggle, right = contextual AI actions */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5">
        <FormSegmentedControl
          value={rightPanelTab}
          onChange={(v) => setRightPanelTab(v as 'roadmap' | 'checkin')}
          options={PANEL_TAB_OPTIONS}
          compact
          layoutId="right-panel-tab"
        />

        {rightPanelTab === 'roadmap' ? <RoadmapActions /> : <CheckinActions />}
      </div>

      {/* Panel content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {rightPanelTab === 'checkin' ? <TodayPanel /> : <RoadmapPanel />}
      </div>
    </div>
  )
}

/** Main exported component - unified panel */
export function DateTaskPanel() {
  const mainTab = useMainTab()

  if (mainTab === 'review') {
    return <ReviewPanel />
  }

  return <RoadmapPanelWithToggle />
}
