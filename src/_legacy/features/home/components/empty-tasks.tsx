'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Mascot } from '@/components/common/mascot'

export function EmptyTasks() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6">
        <Mascot mood="empty" size="lg" />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-[var(--color-text-primary)]">
        오늘 할 일이 없어요
      </h3>
      <p className="mb-8 max-w-sm text-[var(--color-text-secondary)]">
        아직 설정된 할 일이 없어요. 로드맵에서 목표에 할 일을 추가해보세요.
      </p>
      <Link href="/roadmap">
        <Button variant="primary">로드맵으로 가기</Button>
      </Link>
    </div>
  )
}
