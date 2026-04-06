'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface OnboardingChipProps {
  emoji: string
  label: string
  selected: boolean
  onClick: () => void
}

export function OnboardingChip({ emoji, label, selected, onClick }: OnboardingChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'flex min-h-[44px] items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors',
        selected
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
          : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/40'
      )}
    >
      {emoji && <span className="text-base">{emoji}</span>}
      <span>{label}</span>
    </motion.button>
  )
}
