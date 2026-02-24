'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const SESSION_KEY = 'demo-cta-dismissed'

function getInitialDismissed(): boolean {
  if (typeof window === 'undefined') return true
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}

/** @alias DemoCTABanner — kept for backwards compatibility with demo-app.tsx */
export { DemoCtaBanner as DemoCTABanner }

export function DemoCtaBanner() {
  const [dismissed, setDismissed] = useState(getInitialDismissed)
  const router = useRouter()

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, 'true')
    setDismissed(true)
  }

  const handleSignup = () => {
    router.push('/signup')
  }

  if (dismissed) return null

  return (
    <>
      {/* Desktop: fixed bottom bar */}
      <div
        className={cn(
          'fixed right-0 bottom-0 left-0 z-40 hidden lg:flex',
          'items-center justify-between px-8 py-3',
          'bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)]'
        )}
      >
        <p className="text-sm font-medium text-white">inu로 나만의 인생 로드맵을 만들어보세요</p>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSignup}
            className="rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-[var(--color-primary-600)] transition-colors hover:bg-white/90 active:scale-[0.98]"
          >
            무료로 시작하기
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg p-1 text-white/80 transition-colors hover:text-white"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile: slim banner above BottomNav (bottom-16 = nav height) */}
      <div
        className={cn(
          'fixed right-0 left-0 z-40 lg:hidden',
          'bottom-16', // sits above the 64px bottom nav
          'flex items-center justify-between px-4 py-2',
          'bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)]'
        )}
      >
        <p className="truncate text-xs font-medium text-white">
          inu로 나만의 인생 로드맵을 만들어보세요
        </p>

        <div className="ml-3 flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleSignup}
            className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary-600)] transition-colors hover:bg-white/90 active:scale-[0.98]"
          >
            시작하기
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-md p-1 text-white/80 transition-colors hover:text-white"
            aria-label="닫기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  )
}
