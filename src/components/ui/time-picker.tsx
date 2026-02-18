'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface TimePickerProps {
  /** Time value in HH:MM format */
  value?: string
  /** Callback with HH:MM string or undefined */
  onChange: (time: string | undefined) => void
  /** Minimum time in HH:MM format */
  min?: string
  /** Maximum time in HH:MM format */
  max?: string
  /** Step interval in minutes (default: 15) */
  step?: number
  /** Compact size for inline forms */
  compact?: boolean
  placeholder?: string
  className?: string
}

function generateTimeOptions(
  min: string,
  max: string,
  step: number
): Array<{ value: string; label: string }> {
  const [minH, minM] = min.split(':').map(Number)
  const [maxH, maxM] = max.split(':').map(Number)

  const startMinutes = minH * 60 + (minM || 0)
  const endMinutes = maxH * 60 + (maxM || 0)

  const options: Array<{ value: string; label: string }> = []

  for (let m = startMinutes; m <= endMinutes; m += step) {
    const hours = Math.floor(m / 60)
    const mins = m % 60
    const value = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`

    const period = hours < 12 ? '오전' : '오후'
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    const label = `${period} ${displayHour}:${String(mins).padStart(2, '0')}`

    options.push({ value, label })
  }

  return options
}

export function TimePicker({
  value,
  onChange,
  min = '00:00',
  max = '23:59',
  step = 15,
  compact = false,
  placeholder = '시간 선택',
  className,
}: TimePickerProps) {
  const options = generateTimeOptions(min, max, step)

  // If current value is not in the option list (e.g. odd time), include it
  const hasCurrentValue = value && options.some((o) => o.value === value)
  if (value && !hasCurrentValue) {
    const [h, m] = value.split(':').map(Number)
    const period = h < 12 ? '오전' : '오후'
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
    const label = `${period} ${displayHour}:${String(m).padStart(2, '0')}`
    options.push({ value, label })
    options.sort((a, b) => a.value.localeCompare(b.value))
  }

  return (
    <Select value={value ?? ''} onValueChange={(v: string) => onChange(v || undefined)}>
      <SelectTrigger
        className={cn(
          compact ? 'h-8 text-xs [background:var(--color-bg-tertiary)]' : 'h-10',
          className
        )}
        style={
          compact
            ? ({ borderColor: 'var(--color-border-hover)' } as React.CSSProperties)
            : undefined
        }
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
