'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useDemoMode } from '@/lib/demo/demo-context'
import { signInAsGuest } from '@/actions/auth.actions'

const TAB_MESSAGES: Record<string, { title: string; desc: string }> = {
  home: {
    title: '오늘의 할 일을 관리하세요',
    desc: '체크인, 스트릭, 회고까지 한 곳에서',
  },
  roadmap: {
    title: '나만의 로드맵을 만드세요',
    desc: '방향 → 목표 → 실천, Why Chain으로 연결',
  },
  review: {
    title: '성장 기록을 확인하세요',
    desc: '데이터로 보는 나의 변화',
  },
}

export function DemoLockedOverlay({ children }: { children: React.ReactNode }) {
  const { activeTab } = useDemoMode()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const msg = TAB_MESSAGES[activeTab] ?? TAB_MESSAGES.home

  const handleGuest = () => {
    startTransition(async () => {
      const result = await signInAsGuest()
      if (result.success && result.data) {
        router.push(result.data.redirectTo)
      }
    })
  }

  return (
    <div className="relative h-full">
      {children}

      {/* Frosted glass overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--color-bg-primary)]/60 backdrop-blur-md">
        <div className="flex max-w-[240px] flex-col items-center text-center">
          <div className="mb-4 text-3xl">🔒</div>
          <h3 className="mb-1.5 text-base font-semibold text-[var(--color-text-primary)]">
            {msg.title}
          </h3>
          <p className="mb-6 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {msg.desc}
          </p>

          <button
            type="button"
            onClick={() => router.push('/signup')}
            className="w-full rounded-xl bg-[var(--color-primary-500)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-600)] active:scale-[0.98]"
          >
            무료로 시작하기
          </button>

          <button
            type="button"
            onClick={handleGuest}
            disabled={isPending}
            className="mt-3 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)] disabled:opacity-50"
          >
            {isPending ? '접속 중...' : '가입 없이 체험하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
