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
import { RoadmapAiModals } from './roadmap-ai-modals'

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
      {/* Desktop: Visual Tree — outside PageContainer so it fills viewport exactly */}
      <div className="hidden h-full bg-[var(--color-bg-primary)] lg:flex lg:flex-col">
        <div className="shrink-0 px-8 pt-6 pb-4">
          <RoadmapHeader />
        </div>
        <Suspense fallback={<VisualTreeSkeleton />}>
          <VisualTreeWrapper />
        </Suspense>
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

      {/* AI Modals — single instance for both desktop & mobile */}
      <RoadmapAiModals />

      {/* Version Management Modals */}
      <NewVersionWizard />
      <VersionHistoryPanel />
      <RestoreConfirmDialog />
      <DeleteVersionDialog />
    </>
  )
}
