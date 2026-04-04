'use client'

import { motion } from 'framer-motion'
import { X, RefreshCw } from 'lucide-react'
import type { ProfileTrait } from '@/types/entities'
import { PokedexTraitHistory } from './pokedex-trait-history'

interface PokedexHabitsProps {
  traits: ProfileTrait[]
  onEditTrait: (trait: ProfileTrait) => void
  onDeleteTrait: (id: string) => void
}

export function PokedexHabits({ traits, onEditTrait, onDeleteTrait }: PokedexHabitsProps) {
  if (traits.length === 0) return null

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
            background: 'oklch(60% 0.12 160 / 12%)',
            border: '1px solid oklch(60% 0.12 160 / 20%)',
          }}
        >
          <RefreshCw className="h-3 w-3" style={{ color: 'var(--color-area-health)' }} />
        </div>
        <p className="text-[10px] font-semibold tracking-[0.15em] text-[var(--color-text-tertiary)] uppercase">
          습관 &amp; 루틴
        </p>
        <div className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
        <span className="font-mono text-[10px] text-[var(--color-text-disabled)]">
          {traits.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {traits.map((trait, i) => (
          <div key={trait.id}>
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, duration: 0.2, ease: 'easeOut' }}
              className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1 transition-all hover:border-[var(--color-primary-200)] hover:shadow-sm"
              style={{ background: 'var(--color-bg-primary)' }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: 'var(--color-area-health)' }}
              />
              <button
                onClick={() => onEditTrait(trait)}
                className="max-w-[130px] truncate text-xs font-medium text-[var(--color-text-primary)]"
              >
                {trait.label}: {trait.value}
              </button>
              <button
                onClick={() => onDeleteTrait(trait.id)}
                className="ml-0.5 shrink-0 text-[var(--color-text-disabled)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--color-miss)]"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
            <PokedexTraitHistory currentValue={trait.value} history={trait.history} />
          </div>
        ))}
      </div>
    </div>
  )
}
