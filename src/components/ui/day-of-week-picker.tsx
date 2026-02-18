'use client'

import { cn } from '@/lib/utils'
import { DAY_ORDER, DAY_LABELS } from '@/lib/utils/repeat-utils'

interface DayOfWeekPickerProps {
  selectedDays: number[]
  onChange: (days: number[]) => void
  compact?: boolean
  disabled?: boolean
}

export function DayOfWeekPicker({
  selectedDays,
  onChange,
  compact = false,
  disabled = false,
}: DayOfWeekPickerProps) {
  const toggleDay = (day: number) => {
    if (disabled) return
    const isSelected = selectedDays.includes(day)
    if (isSelected) {
      onChange(selectedDays.filter((d) => d !== day))
    } else {
      onChange([...selectedDays, day])
    }
  }

  return (
    <div className="flex gap-1.5">
      {DAY_ORDER.map((day, idx) => {
        const isSelected = selectedDays.includes(day)
        return (
          <button
            key={day}
            type="button"
            disabled={disabled}
            onClick={() => toggleDay(day)}
            className={cn(
              'flex items-center justify-center rounded-full font-medium transition-colors',
              compact ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-xs',
              isSelected
                ? 'bg-[var(--color-primary-500)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)]',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {DAY_LABELS[idx]}
          </button>
        )
      })}
    </div>
  )
}
