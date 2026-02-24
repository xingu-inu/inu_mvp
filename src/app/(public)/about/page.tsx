import type { Metadata } from 'next'
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

export default function AboutPage() {
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
