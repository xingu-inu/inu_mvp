import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import {
  LandingLayout,
  LandingHeader,
  LandingHero,
  LandingSections,
  LandingFooter,
} from '@/features/landing/components'

export const metadata: Metadata = {
  title: 'inu - 내 인생의 로드맵',
  description: '방향 → 목표 → 실천. 왜 하는지 기억하면서, 내 시간 안에서 조금씩 나아가세요.',
  openGraph: {
    title: 'inu - 내 인생의 로드맵',
    description: '인생 로드맵을 그리고, 매일 한 걸음씩 나아가는 자기개발 앱',
    type: 'website',
  },
}

export default async function LandingPage() {
  // 로그인 상태 확인 (defense-in-depth: proxy.ts도 처리함)
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
    <LandingLayout>
      <div className="min-h-screen bg-[var(--color-bg-primary)]">
        <LandingHeader transparent />
        <main>
          <LandingHero />
          <LandingSections />
        </main>
        <LandingFooter />
      </div>
    </LandingLayout>
  )
}
