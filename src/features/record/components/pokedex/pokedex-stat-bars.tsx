'use client'

import { Pencil, Trash2, Zap } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import type { ProfileTrait } from '@/types/entities'

interface PokedexStatBarsProps {
  traits: ProfileTrait[]
  onEditTrait: (trait: ProfileTrait) => void
  onDeleteTrait: (id: string) => void
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
}

const barVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.28, ease: 'easeOut' as const } },
}

// Cycling gradient fills for each bar
const BAR_GRADIENTS = [
  'linear-gradient(90deg, var(--color-area-career), oklch(58% 0.14 240))',
  'linear-gradient(90deg, var(--color-area-health), oklch(60% 0.12 160))',
  'linear-gradient(90deg, var(--color-area-mental), oklch(65% 0.1 300))',
  'linear-gradient(90deg, var(--color-area-relationships), oklch(65% 0.12 15))',
  'linear-gradient(90deg, var(--color-area-finance), oklch(68% 0.11 55))',
]

export function PokedexStatBars({ traits, onEditTrait, onDeleteTrait }: PokedexStatBarsProps) {
  if (traits.length === 0) return null

  const maxLen = Math.max(...traits.map((t) => t.value.length))

  return (
    <div
      className="rounded-xl border border-[var(--color-border)] p-3"
      style={{ background: 'var(--color-bg-secondary)' }}
    >
      {/* Section header */}
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex h-5 w-5 items-center justify-center rounded-md"
          style={{
            background: 'oklch(58% 0.14 240 / 12%)',
            border: '1px solid oklch(58% 0.14 240 / 20%)',
          }}
        >
          <Zap className="h-3 w-3" style={{ color: 'var(--color-area-career)' }} />
        </div>
        <p className="text-[10px] font-semibold tracking-[0.15em] text-[var(--color-text-tertiary)] uppercase">
          스탯
        </p>
        <div className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
        <span className="font-mono text-[10px] text-[var(--color-text-disabled)]">
          {traits.length}
        </span>
      </div>

      <motion.div
        className="space-y-2.5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {traits.map((trait, index) => {
          const percent = Math.max(25, (trait.value.length / maxLen) * 100)
          const gradient = BAR_GRADIENTS[index % BAR_GRADIENTS.length]
          return (
            <motion.div
              key={trait.id}
              variants={barVariants}
              className="group flex items-center gap-2"
            >
              <span className="w-16 shrink-0 truncate text-xs font-medium text-[var(--color-text-secondary)]">
                {trait.label}
              </span>
              <div
                className="h-3 flex-1 overflow-hidden rounded-full"
                style={{ background: 'var(--color-bg-canvas)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: gradient }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.06 }}
                />
              </div>
              <span className="w-20 shrink-0 truncate text-xs text-[var(--color-text-tertiary)]">
                {trait.value}
              </span>
              <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => onEditTrait(trait)}
                  className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDeleteTrait(trait.id)}
                  className="rounded-lg p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger-hover-bg)] hover:text-[var(--color-miss)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
