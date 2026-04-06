'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { WHY_CHIPS } from '@/lib/constants/onboarding'

interface OnboardingStepConfirmProps {
  statement: string
  whyId: string
  onConfirm: (editedStatement: string) => void
  onBack: () => void
  isSubmitting: boolean
}

export function OnboardingStepConfirm({
  statement,
  whyId,
  onConfirm,
  onBack,
  isSubmitting,
}: OnboardingStepConfirmProps) {
  const [editedStatement, setEditedStatement] = useState(statement)
  const whyChip = WHY_CHIPS.find((c) => c.id === whyId)

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">이런 느낌이에요?</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          수정해도 돼요, 나중에 바꿀 수도 있어요
        </p>
      </div>

      {/* Direction card */}
      <div className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 p-6">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
          <span className="text-xs font-medium text-[var(--color-primary)]">나의 방향</span>
        </div>
        <input
          type="text"
          value={editedStatement}
          onChange={(e) => setEditedStatement(e.target.value)}
          className="w-full bg-transparent text-lg font-semibold text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none"
          maxLength={200}
        />
        {whyChip && (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{whyChip.why}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={() => onConfirm(editedStatement)}
          disabled={isSubmitting || !editedStatement.trim()}
          className="flex min-h-[44px] items-center justify-center rounded-2xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {isSubmitting ? '설정 중...' : '시작하기'}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="text-sm text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
        >
          다시 고르기
        </button>
      </div>
    </div>
  )
}
