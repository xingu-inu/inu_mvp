'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { DemoSegmentControl } from './demo-segment-control'
import { useDemoMode } from '@/lib/demo/demo-context'

export function DemoDesktopTopBar() {
  const { showLoginGate } = useDemoMode()
  const router = useRouter()

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
          onClick={() => router.push('/signup')}
          className="rounded-lg bg-[var(--color-primary-500)] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-600)]"
        >
          시작하기
        </button>
      </nav>
    </header>
  )
}
