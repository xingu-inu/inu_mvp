'use client'

import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FormSegmentedControlOption {
  value: string
  label: string
}

interface FormSegmentedControlProps {
  value: string
  onChange: (value: string) => void
  options: FormSegmentedControlOption[]
  compact?: boolean
  className?: string
  layoutId?: string
}

export function FormSegmentedControl({
  value,
  onChange,
  options,
  compact = false,
  className,
  layoutId,
}: FormSegmentedControlProps) {
  const autoId = useId()
  const resolvedLayoutId = layoutId ?? `form-segment-${autoId}`

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full bg-[var(--color-bg-tertiary)] p-1',
        className
      )}
      role="radiogroup"
    >
      {options.map((option) => {
        const isActive = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative rounded-full font-medium transition-colors',
              compact ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
              isActive
                ? 'text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            )}
          >
            {isActive && (
              <motion.span
                layoutId={resolvedLayoutId}
                className="absolute inset-0 rounded-full bg-[var(--color-primary-500)]"
                transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
