'use client'

import { Lightbulb, PanelRight } from 'lucide-react'
import { useRoadmapStore, selectIsFloatingPanelOpen } from '@/stores/roadmap.store'
import { useAiChatStore } from '@/stores/ai-chat.store'
import { useGoalStats } from '../hooks/use-goal-stats'
import { CanvasToolbar } from './canvas/canvas-toolbar'
import { RoadmapStatsSummary } from './roadmap-stats-summary'
import { VersionDropdown } from './version/version-dropdown'
import { StatusFilter } from './status-filter'

export function RoadmapHeader() {
  const isOpen = useRoadmapStore(selectIsFloatingPanelOpen)
  const rightPanelTab = useRoadmapStore((s) => s.rightPanelTab)
  const toggle = useRoadmapStore((s) => s.toggleFloatingPanel)
  const stats = useGoalStats()

  return (
    <div className="space-y-4">
      {/* Title Row */}
      <div className="pointer-events-auto flex items-start justify-between lg:drop-shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">로드맵</h1>
            <VersionDropdown />
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            <RoadmapStatsSummary stats={stats} />
          </p>
        </div>
        <CanvasToolbar className="hidden lg:flex">
          <CanvasToolbar.Toggle
            active={isOpen && rightPanelTab === 'ai-chat'}
            icon={<Lightbulb className="h-5 w-5" />}
            onClick={() => {
              useAiChatStore.getState().openChatWithContext({ type: 'brain-dump' })
              const store = useRoadmapStore.getState()
              store.setRightPanelTab('ai-chat')
              store.setFloatingPanelOpen(true)
            }}
            aria-label="쏟아내기"
            title="생각 쏟아내기"
          />
          <CanvasToolbar.Toggle
            active={isOpen}
            icon={<PanelRight className="h-5 w-5" />}
            onClick={toggle}
            aria-label="패널 토글"
            title={isOpen ? '패널 닫기 (])' : '패널 열기 (])'}
          />
        </CanvasToolbar>
      </div>

      {/* Filter Row */}
      <div className="pointer-events-auto w-fit">
        <StatusFilter />
      </div>
    </div>
  )
}
