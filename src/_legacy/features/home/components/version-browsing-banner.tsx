'use client'

import { Archive } from 'lucide-react'
import { useHomeStore } from '@/stores/home.store'

interface VersionBrowsingBannerProps {
  version: number | null | undefined
}

export function VersionBrowsingBanner({ version }: VersionBrowsingBannerProps) {
  const setSelectedDirectionId = useHomeStore((s) => s.setSelectedDirectionId)

  return (
    <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
      <Archive className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
        {version != null ? `v${version}` : '과거'} 로드맵 기록을 열람 중이에요
      </span>
      <button
        type="button"
        onClick={() => setSelectedDirectionId(null)}
        className="ml-auto shrink-0 text-xs font-medium text-amber-600 underline underline-offset-2 dark:text-amber-400"
      >
        현재로 돌아가기
      </button>
    </div>
  )
}
