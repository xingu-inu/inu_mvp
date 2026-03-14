import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { DemoApp } from '@/features/demo/components/demo-app'
import { LandingAuthGuard } from '@/features/demo/components/landing-auth-guard'

export const dynamic = 'force-dynamic'

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
  // 서버 사이드 auth check (신규 요청 / 새로고침 시)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    redirect(profile?.onboarding_completed ? '/roadmap' : '/onboarding')
  }

  return (
    <>
      {/* 클라이언트 라우터 캐시 히트 시 안전망: 로그인 상태이면 /roadmap으로 리다이렉트 */}
      <LandingAuthGuard />
      <DemoApp />
    </>
  )
}
