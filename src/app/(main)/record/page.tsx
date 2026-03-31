import type { Metadata } from 'next'
import { PageContainer } from '@/components/layout'

export const metadata: Metadata = {
  title: '기록',
}

export default function RecordPage() {
  return (
    <PageContainer>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">기록</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            나의 흐름과 변화가 여기에 쌓입니다
          </p>
        </div>
      </div>
    </PageContainer>
  )
}
