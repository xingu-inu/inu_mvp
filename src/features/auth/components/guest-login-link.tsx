'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signInAsGuest } from '@/actions/auth.actions'

export function GuestLoginLink() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleGuest = () => {
    setError(null)
    startTransition(async () => {
      const result = await signInAsGuest()
      if (result.success && result.data) {
        router.push(result.data.redirectTo)
      } else {
        setError('게스트 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleGuest}
        disabled={isPending}
        className="text-sm text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)] disabled:opacity-50"
      >
        {isPending ? '접속 중...' : '가입 없이 체험하기 →'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
