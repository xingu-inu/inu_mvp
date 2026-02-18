import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { ForgotPasswordForm } from '@/features/auth/components'

export default function ForgotPasswordPage() {
  return (
    <div className="glass-3 rounded-2xl p-8 shadow-lg">
      <div className="mb-6">
        <Link
          href="/login"
          className="mb-4 inline-flex items-center text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          로그인으로 돌아가기
        </Link>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">비밀번호 재설정</h1>
      </div>

      <ForgotPasswordForm />
    </div>
  )
}
