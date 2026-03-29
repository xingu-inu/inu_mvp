'use client'

import { useDemoMode } from '@/lib/demo/demo-context'
import { GoalBrowsePanel } from '@/features/roadmap/components/panel-modes'
import { ReviewPanel } from '@/features/review/components/review-panel'

export function DemoRightPanel() {
  const { activeTab } = useDemoMode()

  if (activeTab === 'review') {
    return <ReviewPanel />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <GoalBrowsePanel />
      </div>
    </div>
  )
}
