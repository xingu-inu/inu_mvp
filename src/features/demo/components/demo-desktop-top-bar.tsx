'use client'

import { useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { DemoSegmentControl } from './demo-segment-control'
import { useDemoMode } from '@/lib/demo/demo-context'
import { signInAsGuest } from '@/actions/auth.actions'

export function DemoDesktopTopBar() {
  const { showLoginGate } = useDemoMode()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleGuest = () => {
    startTransition(async () => {
      const result = await signInAsGuest()
      if (result.success && result.data) {
        router.push(result.data.redirectTo)
      }
    })
  }

  return (
    <header className="glass-3 sticky top-0 z-20 hidden h-14 items-center px-6 shadow-sm lg:flex">
      {/* Left: Logo */}
      <button
        type="button"
        onClick={showLoginGate}
        className="mr-8 flex items-center"
        aria-label="inu 홈"
      >
        <Image src="/logo.png" alt="inu" width={28} height={28} />
      </button>

      {/* Center: Demo Segment Control */}
      <DemoSegmentControl />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Auth buttons */}
      <nav className="flex items-center gap-2" aria-label="인증 네비게이션">
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          로그인
        </button>
        <button
          type="button"
          onClick={handleGuest}
          disabled={isPending}
          className="rounded-lg border border-[var(--color-border)] px-4 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary-300)] hover:text-[var(--color-primary-500)] disabled:opacity-50"
        >
          {isPending ? '접속 중...' : '게스트로 체험'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/signup')}
          className="rounded-lg bg-[var(--color-primary-500)] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-600)]"
        >
          시작하기
        </button>
      </nav>
    </header>
  )
}
