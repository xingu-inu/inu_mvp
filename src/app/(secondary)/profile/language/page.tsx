import { PageContainer } from '@/components/layout'
import { Card } from '@/components/ui'

export default function LanguagePage() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-2xl font-bold">언어 설정</h1>
          <p className="text-[var(--color-text-secondary)]">앱 언어를 선택하세요</p>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between py-2">
            <span>한국어</span>
            <span className="text-[var(--color-primary-500)]">✓</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between py-2">
            <span>English</span>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
