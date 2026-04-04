'use client'

import { Pencil, Trash2, Quote } from 'lucide-react'
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

      <div className="space-y-3">
        {traits.map((trait, i) => (
          <motion.div
            key={trait.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.08, ease: 'easeOut' }}
            className="group relative flex gap-0"
          >
            {/* Left accent border */}
            <div
              className="w-1 shrink-0 rounded-full"
              style={{ background: 'var(--color-area-daily)' }}
            />
            <div className="min-w-0 flex-1 rounded-r-lg px-4 py-2 transition-colors group-hover:bg-[var(--color-bg-primary)]">
              <p className="text-sm leading-relaxed text-[var(--color-text-primary)] italic">
                {trait.value}
              </p>
              <p className="mt-1 text-right text-xs text-[var(--color-text-tertiary)]">
                — {trait.label}
              </p>
              <PokedexTraitHistory currentValue={trait.value} history={trait.history} />
            </div>
            <div className="ml-2 flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
        ))}
      </div>
    </div>
  )
}
