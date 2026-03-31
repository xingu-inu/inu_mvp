'use client'

import { useState } from 'react'
import { FilterChips } from './filter-chips'
import { TimelineList } from './timeline-list'

export function TimelinePanel() {
  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>(undefined)

  return (
    <div className="flex h-full flex-col">
      {/* Header + Filter */}
      <div className="shrink-0 px-4 pt-4 lg:px-6">
        <h2 className="mb-3 text-base font-semibold text-[var(--color-text-primary)]">나의 흐름</h2>
        <FilterChips selectedAreaId={selectedAreaId} onSelect={setSelectedAreaId} />
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6">
        <TimelineList selectedAreaId={selectedAreaId} />
      </div>
    </div>
  )
}
