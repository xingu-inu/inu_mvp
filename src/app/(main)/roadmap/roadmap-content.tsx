'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { PageContainer } from '@/components/layout'
import {
  RoadmapHeader,
  GoalListSkeleton,
  VisualTreeWrapper,
  VisualTreeSkeleton,
} from '@/features/roadmap'
import { MobileRoadmapFab } from '@/features/roadmap/components/mobile-roadmap-fab'
import { MobileRoadmapView } from '@/features/roadmap/components/mobile-roadmap-view'
import { FloatingPanel } from '@/features/roadmap/components/floating-panel'

const NewVersionWizard = dynamic(
  () =>
    import('@/features/roadmap/components/version').then((m) => ({
      default: m.NewVersionWizard,
    })),
  { ssr: false }
)
const VersionHistoryPanel = dynamic(
  () =>
    import('@/features/roadmap/components/version').then((m) => ({
      default: m.VersionHistoryPanel,
    })),
  { ssr: false }
)
const RestoreConfirmDialog = dynamic(
  () =>
    import('@/features/roadmap/components/version').then((m) => ({
      default: m.RestoreConfirmDialog,
    })),
  { ssr: false }
)
const DeleteVersionDialog = dynamic(
  () =>
    import('@/features/roadmap/components/version').then((m) => ({
      default: m.DeleteVersionDialog,
    })),
  { ssr: false }
)

export default function RoadmapContent() {
  return (
    <>
      {/* Desktop: Visual Tree — canvas fills entire area, header floats on top */}
      <div className="relative hidden h-full lg:flex lg:flex-col">
        <div className="relative flex min-h-0 flex-1 flex-col">
          <Suspense fallback={<VisualTreeSkeleton />}>
            <VisualTreeWrapper />
          </Suspense>
          {/* Floating header overlay — pointer-events only on content, not full width */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-8 pt-6 pb-4">
            <RoadmapHeader />
          </div>
          <FloatingPanel />
        </div>
      </div>

      {/* Mobile: Card-based layout */}
      <PageContainer className="pb-24 lg:hidden">
        <div className="space-y-6">
          <RoadmapHeader />
          <Suspense fallback={<GoalListSkeleton />}>
            <MobileRoadmapView />
          </Suspense>
        </div>
      </PageContainer>

      {/* Mobile: FAB for creating areas/goals + AI features */}
      <MobileRoadmapFab />

      {/* Version Management Modals */}
      <NewVersionWizard />
      <VersionHistoryPanel />
      <RestoreConfirmDialog />
      <DeleteVersionDialog />
    </>
  )
}
