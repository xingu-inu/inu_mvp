import { TopBar, DesktopTopBar, AuthGuard } from '@/components/layout'

export default function SecondaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* Desktop: Top bar with segment control */}
      <DesktopTopBar />

      {/* Mobile: TopBar with back button */}
      <div className="lg:hidden">
        <TopBar variant="secondary" showBackButton />
      </div>

      {/* Main Content */}
      <div className="lg:pt-0">{children}</div>
    </AuthGuard>
  )
}
