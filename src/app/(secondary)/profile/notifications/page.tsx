import { PageContainer } from '@/components/layout'
import { Card } from '@/components/ui'

export default function NotificationsPage() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-2xl font-bold">알림 설정</h1>
          <p className="text-[var(--color-text-secondary)]">알림 환경을 설정하세요</p>
        </div>

        <Card className="p-4">
          <div className="py-8 text-center">
            <p className="text-[var(--color-text-secondary)]">
              알림 설정 옵션이 여기에 표시됩니다.
            </p>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
