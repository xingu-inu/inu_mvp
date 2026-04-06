'use client'

import { useState } from 'react'
import { FEELING_CHIPS, classifyCustomGoalArea } from '@/lib/constants/onboarding'
import { OnboardingChip } from './onboarding-chip'

interface OnboardingStepFeelingProps {
  onNext: (feelingId: string) => void
}

export function OnboardingStepFeeling({ onNext }: OnboardingStepFeelingProps) {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customText, setCustomText] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const handleChipClick = (chipId: string) => {
    setSelected(chipId)
    setShowCustomInput(false)
  }

  const handleCustomToggle = () => {
    setSelected(null)
    setShowCustomInput(true)
  }

  const handleNext = () => {
    if (showCustomInput && customText.trim()) {
      const areaType = classifyCustomGoalArea(customText)
      const matchedChip = FEELING_CHIPS.find((c) => c.areaType === areaType)
      onNext(matchedChip?.id ?? 'creating')
    } else if (selected) {
      onNext(selected)
    }
  }

  const canProceed = selected !== null || (showCustomInput && customText.trim().length > 0)

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          요즘 뭐 하면 기분이 좋아요?
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">거창한 거 아니어도 돼요</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2.5">
        {FEELING_CHIPS.map((chip) => (
          <OnboardingChip
            key={chip.id}
            emoji={chip.emoji}
            label={chip.label}
            selected={selected === chip.id}
            onClick={() => handleChipClick(chip.id)}
          />
        ))}
        <OnboardingChip
          emoji="✏️"
          label="직접 입력"
          selected={showCustomInput}
          onClick={handleCustomToggle}
        />
      </div>

      {showCustomInput && (
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canProceed && handleNext()}
          placeholder="예: 요리할 때, 글 쓸 때..."
          autoFocus
          className="w-full max-w-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none"
        />
      )}

      <button
        type="button"
        onClick={handleNext}
        disabled={!canProceed}
        className="w-full max-w-xs rounded-2xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-30"
      >
        다음
      </button>
    </div>
  )
}
