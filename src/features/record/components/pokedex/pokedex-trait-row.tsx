'use client'

import { motion } from 'framer-motion'
import { Pencil, Trash2 } from 'lucide-react'
import type { ProfileTrait } from '@/types/entities'
import { PokedexTraitHistory } from './pokedex-trait-history'

interface PokedexTraitRowProps {
  trait: ProfileTrait
  index: number
  onEdit: (trait: ProfileTrait) => void
  onDelete: (id: string) => void
}

export function PokedexTraitRow({ trait, index, onEdit, onDelete }: PokedexTraitRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18 }}
      className={`group flex items-center px-2 py-2 ${index % 2 === 1 ? 'rounded-md bg-[var(--color-bg-tertiary)]' : ''}`}
    >
      <span className="w-20 shrink-0 truncate text-xs font-medium text-[var(--color-text-tertiary)]">
        {trait.label}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm text-[var(--color-text-primary)]">{trait.value}</span>
        <PokedexTraitHistory currentValue={trait.value} history={trait.history} />
      </div>
      <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onEdit(trait)}
          className="rounded-lg p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={() => onDelete(trait.id)}
          className="rounded-lg p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger-hover-bg)] hover:text-[var(--color-miss)]"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  )
}
