'use client'

import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { WHY_CHIPS } from '@/lib/constants/onboarding'
import { OnboardingChip } from './onboarding-chip'

interface OnboardingStepWhyProps {
  onNext: (whyId: string) => void
  onBack: () => void
}

export function OnboardingStepWhy({ onNext, onBack }: OnboardingStepWhyProps) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">그게 왜 좋아요?</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">하나만 골라보세요</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2.5">
        {WHY_CHIPS.map((chip) => (
          <OnboardingChip
            key={chip.id}
            emoji=""
            label={chip.label}
            selected={selected === chip.id}
            onClick={() => setSelected(chip.id)}
          />
        ))}
      </div>

      <div className="flex w-full max-w-xs gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[44px] items-center justify-center rounded-2xl border border-[var(--color-border)] px-4 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-tertiary)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="flex-1 rounded-2xl bg-[var(--color-primary)] py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-primary-600)] active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:hover:bg-[var(--color-primary)]"
        >
          다음
        </button>
      </div>
    </div>
  )
}
