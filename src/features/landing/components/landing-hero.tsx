import Link from 'next/link'
import Image from 'next/image'

import { Button } from '@/components/ui'

export function LandingHero() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-16 text-center md:pt-20">
      <Image src="/logo.svg" alt="inu" width={80} height={80} className="mb-4" />

      <p className="mb-8 max-w-md text-lg text-[var(--color-text-secondary)] md:text-xl">
        내 인생의 로드맵을 그리고,
        <br />내 시간 안에서 목표를 관리
      </p>

      <div className="mb-12 space-y-3 text-left">
        <div className="flex items-center gap-3">
          <span className="text-[var(--color-done)]">✓</span>
          <span>인생 로드맵 - 큰 그림 속에서 오늘을 실천</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[var(--color-done)]">✓</span>
          <span>Why Chain - 왜 하는지 항상 기억</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[var(--color-done)]">✓</span>
          <span>원탭 달성 - 15초면 완료</span>
        </div>
      </div>

      <Link href="/signup">
        <Button size="lg" className="px-12">
          시작하기
        </Button>
      </Link>

      <p className="mt-6 text-sm text-[var(--color-text-tertiary)]">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-[var(--color-primary-500)] hover:underline">
          로그인
        </Link>
      </p>
    </section>
  )
}
