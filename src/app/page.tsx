import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { LandingHeader, LandingHero, LandingFooter } from '@/features/landing/components'

export default async function LandingPage() {
  // 로그인 상태 확인
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // 온보딩 상태 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    redirect(profile?.onboarding_completed ? '/home' : '/onboarding')
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <LandingHeader />
      <main>
        <LandingHero />
      </main>
      <LandingFooter />
    </div>
  )
}
