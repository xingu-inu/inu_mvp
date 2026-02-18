import { LandingHeader } from '@/features/landing/components/landing-header'
import { LandingFooter } from '@/features/landing/components/landing-footer'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-y-auto">
      <LandingHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-24 pb-16 md:px-8">{children}</main>
      <LandingFooter />
    </div>
  )
}
