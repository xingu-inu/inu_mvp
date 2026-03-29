import type { Metadata } from 'next'
import { PageContainer } from '@/components/layout'

export const metadata: Metadata = {
  title: '타임라인',
}

export default function TimelinePage() {
  return (
    <PageContainer>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">타임라인</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">여정의 기록이 여기에 쌓입니다</p>
        </div>
      </div>
    </PageContainer>
  )
}
