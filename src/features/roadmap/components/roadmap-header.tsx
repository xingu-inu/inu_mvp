'use client'

import { PanelRight } from 'lucide-react'
import { useRoadmapStore, selectIsFloatingPanelOpen } from '@/stores/roadmap.store'
import { VersionDropdown } from './version/version-dropdown'
import { StatusFilter } from './status-filter'

export function RoadmapHeader() {
  const isOpen = useRoadmapStore(selectIsFloatingPanelOpen)
  const toggle = useRoadmapStore((s) => s.toggleFloatingPanel)

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
            인생의 큰 그림을 그려보세요
          </p>
        </div>
        <button
          onClick={toggle}
          aria-label="패널 토글"
          className={`hidden rounded-lg p-2 transition-colors lg:flex ${
            isOpen
              ? 'bg-[var(--color-primary-500)] text-white'
              : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]'
          }`}
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>

      {/* Filter Row */}
      <div className="pointer-events-auto w-fit">
        <StatusFilter />
      </div>
    </div>
  )
}
