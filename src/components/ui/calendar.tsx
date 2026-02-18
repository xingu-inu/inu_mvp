'use client'

import { DayPicker, getDefaultClassNames, type DayPickerProps } from 'react-day-picker'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type CalendarProps = DayPickerProps & {
  className?: string
}

/** Scoped styles — native CSS ensures selected/today highlights work in Tailwind v4 */
const CALENDAR_STYLES = `
.inu-cal .rdp-selected .rdp-day_button {
  background-color: var(--color-primary-500) !important;
  color: white !important;
}
.inu-cal .rdp-selected .rdp-day_button:hover {
  background-color: var(--color-primary-600) !important;
}
.inu-cal .rdp-today:not(.rdp-selected) .rdp-day_button {
  background-color: var(--color-bg-tertiary);
  font-weight: 600;
}
.inu-cal .rdp-outside .rdp-day_button {
  color: var(--color-text-tertiary);
  opacity: 0.5;
}
.inu-cal .rdp-disabled .rdp-day_button {
  color: var(--color-text-tertiary);
  opacity: 0.3;
}
`

export function Calendar({ className, ...props }: CalendarProps) {
  const defaults = getDefaultClassNames()

  return (
    <div className="inu-cal">
      <style>{CALENDAR_STYLES}</style>
      <DayPicker
        locale={ko}
        showOutsideDays
        components={{
          Chevron: ({ orientation }) =>
            orientation === 'left' ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            ),
        }}
        classNames={{
          root: cn('p-3', defaults.root, className),
          months: cn('relative', defaults.months),
          month: cn('space-y-3', defaults.month),
          month_caption: cn('flex items-center justify-center pt-1', defaults.month_caption),
          caption_label: cn(
            'text-sm font-medium text-[var(--color-text-primary)]',
            defaults.caption_label
          ),
          nav: cn('absolute inset-x-0 top-3 flex items-center justify-between px-1', defaults.nav),
          button_previous: cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md',
            'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]',
            'transition-colors',
            defaults.button_previous
          ),
          button_next: cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md',
            'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]',
            'transition-colors',
            defaults.button_next
          ),
          month_grid: cn('w-full border-collapse', defaults.month_grid),
          weekdays: cn('flex', defaults.weekdays),
          weekday: cn(
            'w-9 text-center text-xs font-medium text-[var(--color-text-tertiary)]',
            defaults.weekday
          ),
          weeks: cn('', defaults.weeks),
          week: cn('mt-0.5 flex', defaults.week),
          day: cn(
            'relative h-9 w-9 text-center text-sm',
            'focus-within:relative focus-within:z-20',
            defaults.day
          ),
          day_button: cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-lg',
            'text-[var(--color-text-primary)]',
            'hover:bg-[var(--color-bg-secondary)] transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]',
            defaults.day_button
          ),
          today: defaults.today,
          selected: defaults.selected,
          outside: defaults.outside,
          disabled: defaults.disabled,
          hidden: 'invisible',
        }}
        {...props}
      />
    </div>
  )
}
