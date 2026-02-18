import Link from 'next/link'

import { PageContainer } from '@/components/layout'
import { Card } from '@/components/ui'

export default function PrivacyPage() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-2xl font-bold">개인정보 보호</h1>
          <p className="text-[var(--color-text-secondary)]">개인정보 설정을 관리하세요</p>
        </div>

        <Card className="p-4">
          <div className="py-8 text-center">
            <p className="text-[var(--color-text-secondary)]">
              개인정보 보호 설정이 여기에 표시됩니다.
            </p>
          </div>
        </Card>

        <Link
          href="/privacy"
          className="inline-flex items-center text-sm text-[var(--color-primary-500)] hover:underline"
        >
          개인정보처리방침 전문 보기 →
        </Link>
      </div>
    </PageContainer>
  )
}
