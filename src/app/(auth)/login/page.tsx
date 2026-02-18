import Link from 'next/link'

import { Card } from '@/components/ui'
import { LoginForm, OAuthButtons } from '@/features/auth/components'

export default function LoginPage() {
  return (
    <Card variant="dive" padding="lg">
      <div className="mb-6 text-center">
        <h1 className="mb-2 text-2xl font-bold text-[var(--color-water-accent)]">inu</h1>
        <p className="text-[var(--color-water-light)]/80">로그인하고 목표를 관리하세요</p>
      </div>

      <div className="auth-form-dive">
        <LoginForm />
      </div>

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-sm text-[var(--color-water-light)]/40">또는</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="auth-form-dive">
        <OAuthButtons />
      </div>

      <div className="mt-6 space-y-2 text-center text-sm">
        <Link
          href="/forgot-password"
          className="block text-[var(--color-water-light)]/60 hover:text-[var(--color-water-light)]"
        >
          비밀번호를 잊으셨나요?
        </Link>
        <p className="text-[var(--color-water-light)]/80">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-[var(--color-water-accent)] hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </Card>
  )
}
