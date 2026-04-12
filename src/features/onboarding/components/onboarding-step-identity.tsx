'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { IDENTITY_CHIP_GROUPS } from '@/lib/constants/onboarding'
import { OnboardingChip } from './onboarding-chip'

interface OnboardingStepIdentityProps {
  onNext: (selectedIds: string[], customInputs: string[]) => void
  initialSelected?: string[]
  initialCustom?: string[]
}

export function OnboardingStepIdentity({
  onNext,
  initialSelected = [],
  initialCustom = [],
}: OnboardingStepIdentityProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected))
  const [customInputs, setCustomInputs] = useState<string[]>(initialCustom)
  const [customText, setCustomText] = useState('')

  const toggleChip = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addCustom = () => {
    const trimmed = customText.trim()
    if (trimmed && !customInputs.includes(trimmed)) {
      setCustomInputs((prev) => [...prev, trimmed])
      setCustomText('')
    }
  }

  const removeCustom = (value: string) => {
    setCustomInputs((prev) => prev.filter((v) => v !== value))
  }

  const canProceed = selected.size > 0 || customInputs.length > 0

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">너에 대해 알려줘!</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">해당하는 것들을 골라봐</p>
      </div>

      <div className="flex w-full flex-col gap-5">
        {IDENTITY_CHIP_GROUPS.map((group) => (
          <div key={group.groupLabel}>
            <p className="mb-2 text-xs font-medium text-[var(--color-text-tertiary)]">
              {group.groupLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.chips.map((chip) => (
                <OnboardingChip
                  key={chip.id}
                  emoji={chip.emoji}
                  label={chip.label}
                  selected={selected.has(chip.id)}
                  onClick={() => toggleChip(chip.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 직접 입력 */}
      <div className="w-full">
        <div className="flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="직접 입력 (예: 대학원생, INFP...)"
            className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customText.trim()}
            aria-label="직접 입력 추가"
            className="flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] px-3 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {customInputs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {customInputs.map((value) => (
              <span
                key={value}
                className="flex items-center gap-1 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary-50)] px-3 py-1 text-sm text-[var(--color-primary-700)]"
              >
                {value}
                <button
                  type="button"
                  onClick={() => removeCustom(value)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--color-primary-100)]"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onNext([...selected], customInputs)}
        disabled={!canProceed}
        className="w-full max-w-xs rounded-2xl bg-[var(--color-primary)] py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-primary-600)] active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:hover:bg-[var(--color-primary)]"
      >
        다음
      </button>
    </div>
  )
}
