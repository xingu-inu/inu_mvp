'use client'

import { usePathname } from 'next/navigation'

import { useRoadmapStore, selectPanelMode, selectRightPanelTab } from '@/stores/roadmap.store'
import { GoalBrowsePanel } from '@/features/roadmap/components/panel-modes'
import { GroupEditForm, GroupCreateForm } from '@/features/roadmap'
import { ReviewPanel } from '@/features/review/components/review-panel'
import { TodayPanel } from '@/features/roadmap/components/today-panel'
import { FormSegmentedControl } from '@/components/ui/form-segmented-control'

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

function RoadmapPanelWithToggle() {
  const rightPanelTab = useRoadmapStore(selectRightPanelTab)
  const setRightPanelTab = useRoadmapStore((s) => s.setRightPanelTab)

  return (
    <div className="flex h-full flex-col">
      {/* Toggle header */}
      <div className="flex items-center justify-center border-b border-[var(--color-border)] px-4 py-3">
        <FormSegmentedControl
          value={rightPanelTab}
          onChange={(v) => setRightPanelTab(v as 'roadmap' | 'checkin')}
          options={PANEL_TAB_OPTIONS}
          compact
          layoutId="right-panel-tab"
        />
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
