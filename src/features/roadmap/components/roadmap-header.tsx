'use client'

import { VersionDropdown } from './version/version-dropdown'
import { StatusFilter } from './status-filter'

export function RoadmapHeader() {
  return (
    <div className="space-y-4">
      {/* Title Row */}
      <div className="pointer-events-auto lg:drop-shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">로드맵</h1>
          <VersionDropdown />
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          인생의 큰 그림을 그려보세요
        </p>
      </div>

      {/* Filter Row */}
      <div className="pointer-events-auto w-fit">
        <StatusFilter />
      </div>
    </div>
  )
}
