import { Card } from '@/components/ui/card'
import { Settings } from 'lucide-react'

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">설정</h1>
      <Card padding="lg" className="flex flex-col items-center justify-center py-16">
        <Settings className="mb-4 h-12 w-12 text-[var(--color-text-tertiary)]" />
        <p className="text-lg font-medium text-[var(--color-text-secondary)]">준비 중입니다</p>
        <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
          관리자 설정 기능이 곧 추가됩니다.
        </p>
      </Card>
    </div>
  )
}
