'use client'

import { memo, useState } from 'react'

interface ResponseChipsProps {
  chips: { label: string; message: string }[]
  onSend: (message: string) => void
  disabled?: boolean
}

export const ResponseChips = memo(function ResponseChips({
  chips,
  onSend,
  disabled,
}: ResponseChipsProps) {
  const [used, setUsed] = useState(false)

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {chips.map((chip, i) => (
        <button
          key={`${chip.label}-${i}`}
          type="button"
          disabled={disabled || used}
          onClick={() => {
            setUsed(true)
            onSend(chip.message)
          }}
          className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-600)] disabled:pointer-events-none disabled:opacity-40"
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
})
