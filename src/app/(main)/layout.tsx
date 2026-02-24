import {
  TopBar,
  BottomNav,
  DesktopTopBar,
  AuthGuard,
  DetailPanelShell,
  DateTaskPanel,
} from '@/components/layout'
import { FloatingAIButton } from '@/components/layout/floating-ai-button'
import { GuestBanner } from '@/components/layout/guest-banner'
import { createClient } from '@/lib/supabase/server'
import { isGuestUser } from '@/lib/utils/guest'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isGuest = isGuestUser(user)

  return (
    <AuthGuard>
      {/* Desktop viewport lock — prevents body scroll */}
      <div className="lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
        {isGuest && <GuestBanner />}

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

      {/* AI Floating Chat */}
      <FloatingAIButton />

      {/* Mobile: BottomNav */}
      <BottomNav />
    </AuthGuard>
  )
}
