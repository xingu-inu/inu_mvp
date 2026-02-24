'use client'

import { useState, useCallback, useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { DemoModeProvider, type DemoTab } from '@/lib/demo/demo-context'
import { DemoDataSeeder } from '@/lib/demo/demo-data-seeder'
import { DetailPanelShell } from '@/components/layout/detail-panel-shell'
import { DemoDesktopTopBar } from './demo-desktop-top-bar'
import { DemoBottomNav } from './demo-bottom-nav'
import { DemoCTABanner } from './demo-cta-banner'
import { DemoGateModal } from './demo-gate-modal'
import { DemoHomeContent } from './demo-home-content'
import { DemoRoadmapContent } from './demo-roadmap-content'
import { DemoReviewContent } from './demo-review-content'
import { DemoRightPanel } from './demo-right-panel'

export function DemoApp() {
  const [activeTab, setActiveTab] = useState<DemoTab>('home')
  const [gateOpen, setGateOpen] = useState(false)

  // Create a dedicated QueryClient for demo mode
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
          mutations: {
            onError: () => {
              setGateOpen(true)
            },
          },
        },
      })
  )

  const showLoginGate = useCallback(() => setGateOpen(true), [])

  const contextValue = useMemo(
    () => ({
      isDemoMode: true,
      showLoginGate,
      activeTab,
      setActiveTab,
    }),
    [showLoginGate, activeTab]
  )

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <DemoModeProvider value={contextValue}>
          <DemoDataSeeder>
            <div className="flex h-dvh flex-col overflow-hidden">
              <DemoDesktopTopBar />

              <div className="min-h-0 flex-1 pb-16 lg:flex lg:pb-0">
                <div className="min-w-0 flex-1 overflow-y-auto">
                  {activeTab === 'home' && <DemoHomeContent />}
                  {activeTab === 'roadmap' && <DemoRoadmapContent />}
                  {activeTab === 'review' && <DemoReviewContent />}
                </div>

                {/* Desktop right panel */}
                <DetailPanelShell variant="secondary">
                  <DemoRightPanel />
                </DetailPanelShell>
              </div>

              <DemoCTABanner />
              <DemoBottomNav />
            </div>

            <DemoGateModal open={gateOpen} onOpenChange={setGateOpen} />
          </DemoDataSeeder>
        </DemoModeProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  )
}
