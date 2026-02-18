import Link from 'next/link'

import { Card } from '@/components/ui'
import { SignupForm, OAuthButtons } from '@/features/auth/components'

export default function SignupPage() {
  return (
    <Card variant="dive" padding="lg">
      <div className="mb-6 text-center">
        <h1 className="mb-2 text-2xl font-bold text-[var(--color-water-accent)]">inu</h1>
        <p className="text-[var(--color-water-light)]/80">새 계정을 만들어 시작하세요</p>
      </div>

      <div className="auth-form-dive">
        <SignupForm />
      </div>

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-sm text-[var(--color-water-light)]/40">또는</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="auth-form-dive">
        <OAuthButtons />
      </div>

      <p className="mt-6 text-center text-sm text-[var(--color-water-light)]/80">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-[var(--color-water-accent)] hover:underline">
          로그인
        </Link>
      </p>
    </Card>
  )
}
