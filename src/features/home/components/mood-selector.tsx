'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { MoodLevel } from '@/types/entities'

const MOOD_OPTIONS: { value: MoodLevel; emoji: string; label: string }[] = [
  { value: 'terrible', emoji: '😫', label: '최악' },
  { value: 'bad', emoji: '😕', label: '별로' },
  { value: 'neutral', emoji: '😐', label: '보통' },
  { value: 'good', emoji: '🙂', label: '좋음' },
  { value: 'great', emoji: '😄', label: '최고' },
]

interface MoodSelectorProps {
  value?: MoodLevel | null
  onChange: (mood: MoodLevel) => void
  disabled?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  hideLabel?: boolean
}

export function MoodSelector({
  value,
  onChange,
  disabled = false,
  size = 'md',
  hideLabel = false,
}: MoodSelectorProps) {
  const [hoveredMood, setHoveredMood] = useState<MoodLevel | null>(null)

  const sizeClasses = {
    xs: 'w-6 h-6 text-base',
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-2xl',
    lg: 'w-12 h-12 text-3xl',
  }

  const gapClasses = {
    xs: 'gap-0.5',
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-3',
  }

  return (
    <div className="space-y-2">
      <div
        className={cn('flex items-center justify-center', gapClasses[size])}
        role="radiogroup"
        aria-label="오늘의 기분"
      >
        {MOOD_OPTIONS.map((option) => {
          const isSelected = value === option.value
          const isHovered = hoveredMood === option.value

          return (
            <motion.button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={option.label}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              onMouseEnter={() => setHoveredMood(option.value)}
              onMouseLeave={() => setHoveredMood(null)}
              className={cn(
                'flex items-center justify-center rounded-full transition-all',
                sizeClasses[size],
                'hover:bg-[var(--color-bg-secondary)]',
                'focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-2 focus:outline-none',
                isSelected &&
                  'bg-[var(--color-primary-100)] ring-2 ring-[var(--color-primary-500)]',
                disabled && 'cursor-not-allowed opacity-50'
              )}
              whileHover={{ scale: disabled ? 1 : 1.1 }}
              whileTap={{ scale: disabled ? 1 : 0.95 }}
              animate={{
                scale: isSelected ? 1.15 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <span
                className={cn('transition-transform', (isSelected || isHovered) && 'scale-110')}
              >
                {option.emoji}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* Label for selected/hovered mood */}
      {!hideLabel && (
        <div className="h-5 text-center">
          {(value || hoveredMood) && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-[var(--color-text-secondary)]"
            >
              {MOOD_OPTIONS.find((m) => m.value === (hoveredMood || value))?.label}
            </motion.p>
          )}
        </div>
      )}
    </div>
  )
}
