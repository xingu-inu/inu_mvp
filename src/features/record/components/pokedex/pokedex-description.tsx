'use client'

import { Pencil, Trash2 } from 'lucide-react'
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
  return (
    <div className="border-t border-[var(--color-border)] px-3 py-2">
      {/* Section header */}
      <div className="mb-1 flex items-center gap-2">
        <p className="shrink-0 text-[10px] font-semibold tracking-[0.12em] text-[var(--color-text-tertiary)] uppercase">
          자기 소개
        </p>
        <div className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
      </div>

      {traits.length > 0 ? (
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
                <span className="text-sm text-[var(--color-text-primary)] italic">
                  {trait.value}
                </span>
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
      ) : (
        <div className="flex cursor-default items-center rounded-md px-2 py-1.5 text-[var(--color-text-disabled)]">
          <span className="w-20 shrink-0 text-xs font-medium">???</span>
          <span className="text-xs">미발견</span>
        </div>
      )}
    </div>
  )
}
