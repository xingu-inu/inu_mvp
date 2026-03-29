import {
  TopBar,
  BottomNav,
  DesktopTopBar,
  AuthGuard,
  DetailPanelShell,
  DateTaskPanel,
} from '@/components/layout'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* Desktop viewport lock — prevents body scroll */}
      <div className="lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
        {/* Desktop: Top bar with segment control */}
        <DesktopTopBar />

        {/* Mobile: TopBar */}
        <div className="lg:hidden">
          <TopBar />
        </div>

        {/* Content area */}
        <div className="min-h-0 flex-1 pb-20 lg:flex lg:pb-0">
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
    </AuthGuard>
  )
}
