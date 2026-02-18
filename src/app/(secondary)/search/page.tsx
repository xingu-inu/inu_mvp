'use client'

import { PageContainer } from '@/components/layout'
import { Card, Input } from '@/components/ui'

export default function SearchPage() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-2xl font-bold">검색</h1>
          <p className="text-[var(--color-text-secondary)]">Goal, Task, 기록을 검색해보세요</p>
        </div>

        <Input type="search" placeholder="검색어를 입력하세요..." className="w-full" />

        <Card className="p-4">
          <div className="py-12 text-center">
            <p className="mb-4 text-4xl">🔍</p>
            <p className="text-[var(--color-text-secondary)]">
              검색어를 입력하면 결과가 여기에 표시됩니다.
            </p>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
