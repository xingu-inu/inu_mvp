'use client'

import { memo, useState } from 'react'

interface OpeningChipsProps {
  data: {
    greeting: string
    categories: {
      continuing: { label: string; chips: { label: string; message: string }[] }
      fresh: { label: string; chips: { label: string; message: string }[] }
      free: { label: string; hint: string }
    }
  }
  onSend: (message: string) => void
  onFocusInput: (hint: string) => void
  disabled?: boolean
}

type CategoryKey = 'continuing' | 'fresh' | 'free'

export const OpeningChips = memo(function OpeningChips({
  data,
  onSend,
  onFocusInput,
  disabled,
}: OpeningChipsProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  const { categories } = data

  const handleTopChipClick = (key: CategoryKey) => {
    if (key === 'free') {
      if (activeCategory !== 'free') {
        onFocusInput(categories.free.hint)
      }
      setActiveCategory('free')
      setSelectedIndices(new Set())
      return
    }
    setActiveCategory((prev) => (prev === key ? null : key))
    setSelectedIndices(new Set())
  }

  const handleToggleChild = (index: number) => {
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

  const handleSend = () => {
    if (selectedIndices.size === 0) return
    if (activeCategory !== 'continuing' && activeCategory !== 'fresh') return
    const chips = categories[activeCategory].chips
    const ordered = Array.from(selectedIndices).sort((a, b) => a - b)
    const combined = ordered
      .map((i) => chips[i]?.message)
      .filter((message): message is string => Boolean(message))
      .join(', ')
    if (!combined) return
    onSend(combined)
    setSelectedIndices(new Set())
    setActiveCategory(null)
  }

  const topChipBase =
    'rounded-full border px-4 py-2.5 text-sm font-medium min-h-[44px] transition-colors'
  const topChipIdle =
    'border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-600)]'
  const topChipActive =
    'border-[var(--color-primary-500)] bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)]'

  const childChipBase = 'rounded-full border px-3.5 py-2.5 text-sm min-h-[44px] transition-colors'
  const childChipIdle =
    'border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-600)]'
  const childChipSelected =
    'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'

  const activeChildren =
    activeCategory === 'continuing' || activeCategory === 'fresh'
      ? categories[activeCategory].chips
      : null

  return (
    <div className={`my-2 flex flex-col gap-2 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <div className="flex flex-wrap gap-2">
        {(['continuing', 'fresh', 'free'] as const).map((key) => {
          const isActive = activeCategory === key
          const label = key === 'free' ? categories.free.label : categories[key].label
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => handleTopChipClick(key)}
              className={`${topChipBase} ${isActive ? topChipActive : topChipIdle}`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {activeCategory === 'free' && (
        <p className="text-xs text-[var(--color-text-tertiary)] italic">{categories.free.hint}</p>
      )}

      {activeChildren && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {activeChildren.map((chip, i) => {
              const isSelected = selectedIndices.has(i)
              return (
                <button
                  key={`${chip.label}-${i}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleToggleChild(i)}
                  className={`${childChipBase} ${isSelected ? childChipSelected : childChipIdle}`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
          {selectedIndices.size > 0 && (
            <button
              type="button"
              onClick={handleSend}
              disabled={disabled}
              className="self-start rounded-full bg-[var(--color-primary-500)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--color-primary-600)] disabled:pointer-events-none disabled:opacity-40"
            >
              {selectedIndices.size}개 선택됨 • 보내기 →
            </button>
          )}
        </>
      )}
    </div>
  )
})
