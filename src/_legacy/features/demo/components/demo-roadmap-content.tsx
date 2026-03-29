'use client'

import { Suspense } from 'react'
import { PageContainer } from '@/components/layout'
import {
  VisualTreeWrapper,
  VisualTreeSkeleton,
  GoalList,
  GoalListSkeleton,
} from '@/features/roadmap'
import { RoadmapHeader } from '@/features/roadmap'

export function DemoRoadmapContent() {
  return (
    <>
      {/* Desktop: Visual Tree -- fills viewport */}
      <div className="hidden h-full bg-[var(--color-bg-primary)] lg:flex lg:flex-col">
        <div className="shrink-0 px-8 pt-6 pb-4">
          <RoadmapHeader />
        </div>
        <Suspense fallback={<VisualTreeSkeleton />}>
          <VisualTreeWrapper />
        </Suspense>
      </div>

      {/* Mobile: Single Column */}
      <PageContainer className="pb-24 lg:hidden">
        <div className="space-y-6">
          <RoadmapHeader />
          <Suspense fallback={<GoalListSkeleton />}>
            <GoalList isMobile />
          </Suspense>
        </div>
      </PageContainer>
    </>
  )
}
