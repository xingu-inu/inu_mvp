'use client'

import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { VALUE_CHIPS } from '@/lib/constants/onboarding'
import { OnboardingChip } from './onboarding-chip'

interface OnboardingStepValuesProps {
  onNext: (selectedIds: string[]) => void
  onBack: () => void
  initialSelected?: string[]
}

export function OnboardingStepValues({
  onNext,
  onBack,
  initialSelected = [],
}: OnboardingStepValuesProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected))

  const toggleChip = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          어떤 삶을 살고 싶어?
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">끌리는 것들을 골라봐</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2.5">
        {VALUE_CHIPS.map((chip) => (
          <OnboardingChip
            key={chip.id}
            emoji={chip.emoji}
            label={chip.label}
            selected={selected.has(chip.id)}
            onClick={() => toggleChip(chip.id)}
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
          onClick={() => onNext([...selected])}
          disabled={selected.size === 0}
          className="flex-1 rounded-2xl bg-[var(--color-primary)] py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-primary-600)] active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:hover:bg-[var(--color-primary)]"
        >
          다음
        </button>
      </div>
    </div>
  )
}
