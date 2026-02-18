'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui'

export default function RoadmapError({
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-6">
      <div className="mb-4 text-4xl">😵</div>
      <h2 className="mb-2 text-lg font-semibold">로드맵을 불러올 수 없어요</h2>
      <p className="mb-4 text-center text-[var(--color-text-secondary)]">
        잠시 후 다시 시도해주세요.
      </p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  )
}
