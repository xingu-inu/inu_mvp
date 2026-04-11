'use client'

import { memo, useState } from 'react'

interface ResponseChipsProps {
  chips: { label: string; message: string }[]
  multi?: boolean
  onSend: (message: string) => void
  disabled?: boolean
}

export const ResponseChips = memo(function ResponseChips({
  chips,
  multi = false,
  onSend,
  disabled,
}: ResponseChipsProps) {
  const [clickedIndices, setClickedIndices] = useState<Set<number>>(new Set())
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  const handleSingleClick = (index: number, message: string) => {
    setClickedIndices((prev) => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
    onSend(message)
  }

  const handleToggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleMultiSend = () => {
    if (selectedIndices.size === 0) return
    const ordered = Array.from(selectedIndices).sort((a, b) => a - b)
    const combined = ordered
      .map((i) => chips[i]?.message)
      .filter((message): message is string => Boolean(message))
      .join(', ')
    if (!combined) return
    onSend(combined)
    setSelectedIndices(new Set())
  }

  const baseChipClass =
    'rounded-full border px-3.5 py-2.5 text-sm min-h-[44px] transition-colors disabled:pointer-events-none disabled:opacity-40'
  const idleChipClass =
    'border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-600)]'
  const selectedChipClass =
    'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'

  return (
    <div
      className={`flex flex-col gap-1.5 pt-1 ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    >
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip, i) => {
          const isSelected = multi && selectedIndices.has(i)
          const isClicked = !multi && clickedIndices.has(i)
          return (
            <button
              key={`${chip.label}-${i}`}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (multi) {
                  handleToggleSelect(i)
                } else {
                  handleSingleClick(i, chip.message)
                }
              }}
              className={`${baseChipClass} ${isSelected ? selectedChipClass : idleChipClass} ${
                isClicked ? 'opacity-60' : ''
              }`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>
      {multi && selectedIndices.size > 0 && (
        <button
          type="button"
          onClick={handleMultiSend}
          disabled={disabled}
          className="self-start rounded-full bg-[var(--color-primary-500)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--color-primary-600)] disabled:pointer-events-none disabled:opacity-40"
        >
          {selectedIndices.size}개 선택됨 • 보내기 →
        </button>
      )}
    </div>
  )
})
