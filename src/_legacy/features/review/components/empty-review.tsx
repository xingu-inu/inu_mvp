'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Mascot } from '@/components/common/mascot'

export function EmptyReview() {
  return (
    <div className="py-16 text-center">
      <div className="mb-4 flex justify-center">
        <Mascot mood="encouraging" size="lg" />
      </div>
      <h3 className="mb-2 text-xl font-semibold">아직 기록이 없어요</h3>
      <p className="mx-auto mb-6 max-w-sm text-[var(--color-text-secondary)]">
        오늘부터 달성을 시작하면 여기에 통계가 쌓여요.
        <br />
        꾸준함이 눈에 보이는 순간을 만나보세요!
      </p>
      <Link href="/roadmap">
        <Button>오늘 시작하기</Button>
      </Link>
    </div>
  )
}
