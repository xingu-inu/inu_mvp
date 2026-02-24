'use client'

import Link from 'next/link'

export function GuestBanner() {
  return (
    <div className="flex h-10 items-center justify-center gap-2 bg-amber-50 px-4 text-xs dark:bg-amber-950/30">
      <span className="text-amber-700 dark:text-amber-300">
        👤 게스트 모드 · 데이터가 영구 저장되지 않습니다
      </span>
      <Link
        href="/signup"
        className="font-semibold text-[var(--color-primary-500)] hover:underline"
      >
        계정 만들기
      </Link>
    </div>
  )
}
