'use client'

import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface DemoGateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DemoGateModal({ open, onOpenChange }: DemoGateModalProps) {
  const router = useRouter()

  const handleSignup = () => {
    onOpenChange(false)
    router.push('/signup')
  }

  const handleLogin = () => {
    onOpenChange(false)
    router.push('/login')
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[var(--color-bg-primary)] p-8 shadow-xl focus:outline-none">
          {/* Close button */}
          <Dialog.Close className="absolute top-4 right-4 rounded-lg p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]">
            <X className="h-4 w-4" />
            <span className="sr-only">닫기</span>
          </Dialog.Close>

          {/* Content */}
          <div className="flex flex-col items-center text-center">
            {/* Logo / Emoji */}
            <div className="mb-5 text-5xl">🌱</div>

            {/* Title */}
            <Dialog.Title className="mb-2 text-xl font-bold text-[var(--color-text-primary)]">
              나만의 인생 로드맵을 만들어보세요
            </Dialog.Title>

            {/* Subtitle */}
            <Dialog.Description className="mb-8 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              방향 → 목표 → 실천, 왜 하는지 기억하면서 나아가세요
            </Dialog.Description>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={handleSignup}
              className="mb-3 w-full rounded-xl bg-[var(--color-primary-500)] py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-600)] active:scale-[0.98]"
            >
              무료로 시작하기
            </button>

            {/* Secondary CTA */}
            <button
              type="button"
              onClick={handleLogin}
              className="text-sm text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
            >
              이미 계정이 있나요?{' '}
              <span className="font-medium text-[var(--color-primary-500)]">로그인</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
