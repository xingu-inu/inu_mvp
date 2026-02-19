'use client'

import { BookOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDirection } from '@/queries/use-direction'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { StatusFilter } from './status-filter'

export function RoadmapHeader() {
  const { data: direction } = useDirection()
  const setIsVersionHistoryOpen = useRoadmapStore((s) => s.setIsVersionHistoryOpen)
  const setIsNewVersionWizardOpen = useRoadmapStore((s) => s.setIsNewVersionWizardOpen)

  return (
    <div className="space-y-4">
      {/* Title Row */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">로드맵</h1>
            {direction && direction.version > 1 && (
              <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-[var(--color-text-tertiary)]">
                v{direction.version}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            인생의 큰 그림을 그려보세요
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVersionHistoryOpen(true)}
            className="min-h-[44px] text-[var(--color-text-tertiary)] lg:min-h-0"
          >
            <BookOpen className="mr-1 h-4 w-4" />
            과거 기록
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsNewVersionWizardOpen(true)}
            className="min-h-[44px] lg:min-h-0"
          >
            <Plus className="mr-1 h-4 w-4" />새 로드맵
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <StatusFilter />
    </div>
  )
}
