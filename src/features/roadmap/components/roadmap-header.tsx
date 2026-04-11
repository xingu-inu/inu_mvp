'use client'

import type { ReactNode } from 'react'
import { Lightbulb, PanelRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRoadmapStore, selectIsFloatingPanelOpen } from '@/stores/roadmap.store'
import { useAiChatStore } from '@/stores/ai-chat.store'
import { useGoalStats } from '../hooks/use-goal-stats'
import { CanvasToolbar } from './canvas/canvas-toolbar'
import { RoadmapStatsSummary } from './roadmap-stats-summary'
import { VersionDropdown } from './version/version-dropdown'
import { StatusFilter } from './status-filter'

interface RoadmapHeaderProps {
  /**
   * Optional trailing slot rendered on the filter row, aligned to the right.
   * Used on mobile to place the list/canvas toggle next to the status filter
   * without introducing a mobile-specific layout inside this shared header.
   */
  filterRowSlot?: ReactNode
}

export function RoadmapHeader({ filterRowSlot }: RoadmapHeaderProps = {}) {
  const isOpen = useRoadmapStore(selectIsFloatingPanelOpen)
  const rightPanelTab = useRoadmapStore((s) => s.rightPanelTab)
  const toggle = useRoadmapStore((s) => s.toggleFloatingPanel)
  const stats = useGoalStats()

  return (
    <div className="space-y-4">
      {/* Title Row */}
      <div className="flex items-start justify-between lg:drop-shadow-sm">
        <div className="pointer-events-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">로드맵</h1>
            <VersionDropdown />
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            <RoadmapStatsSummary stats={stats} />
          </p>
        </div>
        <CanvasToolbar className="pointer-events-auto hidden lg:flex">
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

      {/* Filter Row — shrinks to content by default; if a slot is provided
          (mobile list/canvas toggle), stretch to full width and push the slot
          to the right edge. */}
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-3',
          filterRowSlot ? 'justify-between' : 'w-fit'
        )}
      >
        <StatusFilter />
        {filterRowSlot}
      </div>
    </div>
  )
}
