'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signInAsGuest } from '@/actions/auth.actions'

interface DemoMobileTaskGateProps {
  taskCount: number
  children: React.ReactNode
}

export function DemoMobileTaskGate({ taskCount, children }: DemoMobileTaskGateProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const remaining = taskCount - 3

  const handleGuest = () => {
    startTransition(async () => {
      const result = await signInAsGuest()
      if (result.success && result.data) {
        router.push(result.data.redirectTo)
      }
    })
  }

  if (taskCount <= 3) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      {/* Show content but clip after ~3 tasks */}
      <div className="max-h-[280px] overflow-hidden">{children}</div>

      {/* Gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--color-bg-primary)] to-transparent" />

      {/* CTA */}
      <div className="relative -mt-4 flex flex-col items-center gap-3 pt-2">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {remaining}개 더 있어요 · 시작하면 모두 볼 수 있어요
        </p>
        <button
          type="button"
          onClick={() => router.push('/signup')}
          className="rounded-xl bg-[var(--color-primary-500)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-600)] active:scale-[0.98]"
        >
          무료로 시작하기
        </button>
        <button
          type="button"
          onClick={handleGuest}
          disabled={isPending}
          className="text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)] disabled:opacity-50"
        >
          {isPending ? '접속 중...' : '가입 없이 체험하기 →'}
        </button>
      </div>
    </div>
  )
}
