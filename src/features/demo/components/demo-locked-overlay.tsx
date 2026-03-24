'use client'

import { useRouter } from 'next/navigation'
import { useDemoMode } from '@/lib/demo/demo-context'

const TAB_MESSAGES: Record<string, { title: string; desc: string }> = {
  roadmap: {
    title: '나만의 로드맵을 만드세요',
    desc: '방향 → 목표 → 실천이 이유로 연결',
  },
  review: {
    title: '성장 기록을 확인하세요',
    desc: '데이터로 보는 나의 변화',
  },
}

export function DemoLockedOverlay({ children }: { children: React.ReactNode }) {
  const { activeTab } = useDemoMode()
  const router = useRouter()
  const msg = TAB_MESSAGES[activeTab] ?? TAB_MESSAGES.roadmap

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
        </div>
      </div>
    </div>
  )
}
