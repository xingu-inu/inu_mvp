'use client'

import { useState } from 'react'
import { format, parse, isValid } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarDays } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  /** Date value in YYYY-MM-DD format */
  value?: string | null
  /** Callback with YYYY-MM-DD string or null */
  onChange: (date: string | null) => void
  /** Placeholder text */
  placeholder?: string
  /** Compact size for inline forms */
  compact?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = '날짜 선택',
  compact = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
  const isValidDate = selectedDate && isValid(selectedDate)

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'))
    } else {
      onChange(null)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex w-full items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-left',
            'transition-colors hover:border-[var(--color-border-hover)]',
            'focus:border-[var(--color-primary-500)] focus:outline-none',
            compact ? 'h-8 text-xs' : 'h-12 text-sm',
            !isValidDate && 'text-[var(--color-text-tertiary)]',
            className
          )}
        >
          <CalendarDays
            className={cn(
              'shrink-0 text-[var(--color-text-tertiary)]',
              compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
            )}
          />
          <span className="truncate">
            {isValidDate
              ? format(selectedDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })
              : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={isValidDate ? selectedDate : undefined}
          onSelect={handleSelect}
          defaultMonth={isValidDate ? selectedDate : undefined}
        />
        {isValidDate && (
          <div className="border-t border-[var(--color-border)] px-3 py-2">
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className="text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
            >
              날짜 해제
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
