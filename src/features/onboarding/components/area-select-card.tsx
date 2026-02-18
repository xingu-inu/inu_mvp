'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DefaultAreaOption } from '@/lib/constants/onboarding'

interface AreaSelectCardProps {
  area: DefaultAreaOption
  selected: boolean
  onToggle: () => void
  index: number
}

export function AreaSelectCard({ area, selected, onToggle, index }: AreaSelectCardProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className={cn(
        'relative flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors',
        selected
          ? 'border-current bg-current/5'
          : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-hover)]'
      )}
      style={
        selected
          ? { color: area.color, borderColor: area.color, backgroundColor: `${area.color}15` }
          : undefined
      }
    >
      <span className="text-2xl">{area.emoji}</span>
      <span
        className={cn(
          'flex-1 text-sm font-medium',
          selected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
        )}
      >
        {area.name}
      </span>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <Check className="h-5 w-5" style={{ color: area.color }} />
        </motion.div>
      )}
    </motion.button>
  )
}
