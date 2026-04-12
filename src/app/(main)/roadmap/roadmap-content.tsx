'use client'

import { Suspense, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import { PageContainer } from '@/components/layout'
import { FormSegmentedControl } from '@/components/ui/form-segmented-control'
import {
  RoadmapHeader,
  GoalListSkeleton,
  VisualTreeWrapper,
  VisualTreeSkeleton,
} from '@/features/roadmap'
import { MobileRoadmapFab } from '@/features/roadmap/components/mobile-roadmap-fab'
import { InuFullscreen } from '@/features/roadmap/components/inu-fullscreen'
import { MobileRoadmapView } from '@/features/roadmap/components/mobile-roadmap-view'
import { FloatingPanel } from '@/features/roadmap/components/floating-panel'

type MobileView = 'list' | 'canvas'
const MOBILE_VIEW_STORAGE_KEY = 'roadmap-mobile-view'
const MOBILE_VIEW_CHANGE_EVENT = 'roadmap-mobile-view:change'

const MOBILE_VIEW_OPTIONS = [
  { value: 'list', label: '리스트' },
  { value: 'canvas', label: '캔버스' },
]

// ─ localStorage subscription via useSyncExternalStore ─
// Modeled as an external store so (a) a plain useEffect + setState doesn't
// trip `react-hooks/set-state-in-effect`, and (b) multiple tabs stay in sync
// via the native `storage` event. Hydration safety comes from the stable
// `getServerSnapshot` below, which always returns the default `'list'`.
function subscribeMobileView(cb: () => void) {
  window.addEventListener('storage', cb)
  window.addEventListener(MOBILE_VIEW_CHANGE_EVENT, cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener(MOBILE_VIEW_CHANGE_EVENT, cb)
  }
}

function getMobileViewSnapshot(): MobileView {
  try {
    const stored = window.localStorage.getItem(MOBILE_VIEW_STORAGE_KEY)
    return stored === 'canvas' || stored === 'list' ? stored : 'list'
  } catch {
    return 'list'
  }
}

function getMobileViewServerSnapshot(): MobileView {
  return 'list'
}

function writeMobileView(next: MobileView) {
  try {
    window.localStorage.setItem(MOBILE_VIEW_STORAGE_KEY, next)
  } catch {
    // localStorage unavailable (private mode, etc.) — just update in-memory.
  }
  // `storage` only fires in other tabs, so notify our own listener too.
  window.dispatchEvent(new Event(MOBILE_VIEW_CHANGE_EVENT))
}

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
const OnboardingModal = dynamic(
  () => import('@/features/onboarding').then((m) => ({ default: m.OnboardingModal })),
  { ssr: false }
)

export default function RoadmapContent() {
  // Mobile-only: toggle between the existing card list and the Why Map canvas
  // in view-only mode. Default to 'list' to preserve current mobile UX;
  // localStorage is read via useSyncExternalStore for hydration safety.
  const mobileView = useSyncExternalStore(
    subscribeMobileView,
    getMobileViewSnapshot,
    getMobileViewServerSnapshot
  )

  const handleMobileViewChange = (next: string) => {
    if (next !== 'list' && next !== 'canvas') return
    writeMobileView(next)
  }

  // Segmented toggle lives inline on the filter row (next to StatusFilter)
  // rather than as its own centered block.
  const mobileViewToggle = (
    <FormSegmentedControl
      value={mobileView}
      onChange={handleMobileViewChange}
      options={MOBILE_VIEW_OPTIONS}
      compact
      layoutId="roadmap-mobile-view"
    />
  )

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

      {/* Mobile: List or Canvas, toggled via segmented control */}
      {mobileView === 'canvas' ? (
        // Canvas needs a concrete parent height because ReactFlow uses
        // `absolute inset-0`. Available visible area =
        //   100dvh − status-bar (safe-top) − BottomNav (h-16 + safe-bottom).
        <div
          className="flex flex-col lg:hidden"
          style={{
            height: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 4rem)',
          }}
        >
          <div className="shrink-0 space-y-3 px-6 pt-4 pb-2">
            <RoadmapHeader filterRowSlot={mobileViewToggle} />
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col">
            <Suspense fallback={<VisualTreeSkeleton />}>
              <VisualTreeWrapper isMobile />
            </Suspense>
          </div>
        </div>
      ) : (
        <PageContainer className="pb-24 lg:hidden">
          <div className="space-y-6">
            <RoadmapHeader filterRowSlot={mobileViewToggle} />
            <Suspense fallback={<GoalListSkeleton />}>
              <MobileRoadmapView />
            </Suspense>
          </div>
        </PageContainer>
      )}

      {/* Mobile: FAB for creating areas/goals + AI features (both modes) */}
      <MobileRoadmapFab />
      <InuFullscreen />

      {/* Version Management Modals */}
      <NewVersionWizard />
      <VersionHistoryPanel />
      <RestoreConfirmDialog />
      <DeleteVersionDialog />

      {/* Onboarding Modal — shows for new users */}
      <OnboardingModal />
    </>
  )
}
