'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-4 text-5xl">😵</div>
      <h2 className="mb-2 text-xl font-semibold">문제가 발생했어요</h2>
      <p className="mb-4 text-center text-[var(--color-text-secondary)]">
        잠시 후 다시 시도해주세요.
      </p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  )
}
