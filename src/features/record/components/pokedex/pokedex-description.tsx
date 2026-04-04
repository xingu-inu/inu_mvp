'use client'

import { Pencil, Quote, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ProfileTrait } from '@/types/entities'
import { PokedexTraitHistory } from './pokedex-trait-history'

interface PokedexDescriptionProps {
  traits: ProfileTrait[]
  onEditTrait: (trait: ProfileTrait) => void
  onDeleteTrait: (id: string) => void
}

export function PokedexDescription({
  traits,
  onEditTrait,
  onDeleteTrait,
}: PokedexDescriptionProps) {
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
            background: 'oklch(55% 0.04 55 / 12%)',
            border: '1px solid oklch(55% 0.04 55 / 22%)',
          }}
        >
          <Quote className="h-3 w-3" style={{ color: 'var(--color-area-daily)' }} />
        </div>
        <p className="text-[10px] font-semibold tracking-[0.15em] text-[var(--color-text-tertiary)] uppercase">
          자기 소개
        </p>
        <div className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
        <span className="font-mono text-[10px] text-[var(--color-text-disabled)]">
          {traits.length}
        </span>
      </div>

      <div>
        {traits.map((trait, i) => (
          <motion.div
            key={trait.id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
            className={`group flex items-center px-2 py-2 ${i % 2 === 1 ? 'rounded-md bg-[var(--color-bg-tertiary)]' : ''}`}
          >
            <span className="w-20 shrink-0 truncate text-xs font-medium text-[var(--color-text-tertiary)]">
              {trait.label}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm text-[var(--color-text-primary)] italic">{trait.value}</span>
              <PokedexTraitHistory currentValue={trait.value} history={trait.history} />
            </div>
            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => onEditTrait(trait)}
                className="rounded-lg p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDeleteTrait(trait.id)}
                className="rounded-lg p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger-hover-bg)] hover:text-[var(--color-miss)]"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
