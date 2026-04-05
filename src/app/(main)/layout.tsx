import {
  BottomNav,
  DesktopTopBar,
  AuthGuard,
  DetailPanelShell,
  DateTaskPanel,
  FloatingAIButton,
} from '@/components/layout'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* Desktop viewport lock — prevents body scroll */}
      <div className="lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
        {/* Desktop: Top bar with segment control */}
        <DesktopTopBar />

        {/* Content area */}
        <div className="min-h-0 flex-1 pt-[env(safe-area-inset-top)] pb-20 lg:flex lg:pt-0 lg:pb-0">
          {/* Main content */}
          <div className="min-w-0 flex-1 lg:overflow-y-auto">{children}</div>

          {/* Shared right panel (desktop only) */}
          <DetailPanelShell variant="secondary">
            <DateTaskPanel />
          </DetailPanelShell>
        </div>
      </div>

      {/* Mobile: BottomNav */}
      <BottomNav />

      {/* Floating AI chat — available on all pages */}
      <FloatingAIButton />
    </AuthGuard>
  )
}
