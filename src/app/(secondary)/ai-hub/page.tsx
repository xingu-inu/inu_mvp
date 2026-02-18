import { PageContainer } from '@/components/layout'
import { Card } from '@/components/ui'

export default function AIHubPage() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-2xl font-bold">AI 허브</h1>
          <p className="text-[var(--color-text-secondary)]">AI 어드바이저와 대화하세요</p>
        </div>

        <Card className="p-4">
          <div className="py-12 text-center">
            <p className="mb-4 text-4xl">🐾</p>
            <p className="text-[var(--color-text-secondary)]">
              이누와 대화를 시작해보세요.
              <br />
              목표 설정, 페이스 조절, 동기 부여에 대한 조언을 받을 수 있어요.
            </p>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
