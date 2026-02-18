import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Card } from '@/components/ui'
import { ForgotPasswordForm } from '@/features/auth/components'

export default function ForgotPasswordPage() {
  return (
    <Card variant="dive" padding="lg">
      <div className="mb-6">
        <Link
          href="/login"
          className="mb-4 inline-flex items-center text-sm text-[var(--color-water-light)]/60 hover:text-[var(--color-water-light)]"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          로그인으로 돌아가기
        </Link>
        <h1 className="text-xl font-bold text-[var(--color-water-light)]">비밀번호 재설정</h1>
      </div>

      <div className="auth-form-dive">
        <ForgotPasswordForm />
      </div>
    </Card>
  )
}
