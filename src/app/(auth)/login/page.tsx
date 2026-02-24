import Image from 'next/image'
import Link from 'next/link'

import { LoginForm, OAuthButtons } from '@/features/auth/components'
import { GuestLoginLink } from '@/features/auth/components/guest-login-link'

export default function LoginPage() {
  return (
    <div className="glass-3 rounded-2xl p-8 shadow-lg">
      <div className="mb-6 flex flex-col items-center text-center">
        <Image src="/logo.png" alt="inu" width={48} height={48} className="mb-2" />
        <h1 className="mb-1 font-serif text-2xl font-bold text-[var(--color-text-primary)]">inu</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">로그인하고 목표를 관리하세요</p>
      </div>

      <LoginForm />

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-sm text-[var(--color-text-tertiary)]">또는</span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <OAuthButtons />

      <div className="mt-4 text-center">
        <GuestLoginLink />
      </div>

      <div className="mt-6 space-y-2 text-center text-sm">
        <Link
          href="/forgot-password"
          className="block text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
        >
          비밀번호를 잊으셨나요?
        </Link>
        <p className="text-[var(--color-text-secondary)]">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-[var(--color-primary-500)] hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
