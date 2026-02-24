import Image from 'next/image'
import Link from 'next/link'

import { SignupForm, OAuthButtons } from '@/features/auth/components'
import { GuestLoginLink } from '@/features/auth/components/guest-login-link'

export default function SignupPage() {
  return (
    <div className="glass-3 rounded-2xl p-8 shadow-lg">
      <div className="mb-6 flex flex-col items-center text-center">
        <Image src="/logo.png" alt="inu" width={48} height={48} className="mb-2" />
        <h1 className="mb-1 font-serif text-2xl font-bold text-[var(--color-text-primary)]">inu</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">새 계정을 만들어 시작하세요</p>
      </div>

      <SignupForm />

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-sm text-[var(--color-text-tertiary)]">또는</span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <OAuthButtons />

      <div className="mt-4 text-center">
        <GuestLoginLink />
      </div>

      <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-[var(--color-primary-500)] hover:underline">
          로그인
        </Link>
      </p>
    </div>
  )
}
