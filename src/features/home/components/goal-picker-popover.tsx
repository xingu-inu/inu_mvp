'use client'

import { useEffect, useRef } from 'react'
import { Target } from 'lucide-react'

interface GoalPickerPopoverProps {
  goals: Array<{ id: string; name: string }>
  onSelect: (goalId: string) => void
  onCancel: () => void
}

export function GoalPickerPopover({ goals, onSelect, onCancel }: GoalPickerPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCancel()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div
        ref={ref}
        className="w-64 rounded-xl bg-[var(--color-bg-primary)] p-3 shadow-xl ring-1 ring-black/5 dark:ring-white/10"
        role="dialog"
        aria-label="목표 선택"
      >
        <p className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">
          어떤 목표로 이동할까요?
        </p>
        <div className="space-y-1">
          {goals.map((goal) => (
            <button
              key={goal.id}
              onClick={() => onSelect(goal.id)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              <Target className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
              <span className="truncate">{goal.name}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="mt-2 w-full rounded-lg py-1.5 text-xs text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
        >
          취소
        </button>
      </div>
    </div>
  )
}
