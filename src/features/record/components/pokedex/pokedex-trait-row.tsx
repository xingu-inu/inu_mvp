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
  isNew?: boolean
}

export function PokedexTraitRow({ trait, index, onEdit, onDelete, isNew }: PokedexTraitRowProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: -6,
        backgroundColor: isNew ? 'var(--color-primary-50)' : 'transparent',
      }}
      animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
      exit={{
        opacity: 0,
        x: -16,
        height: 0,
        paddingTop: 0,
        paddingBottom: 0,
        transition: { duration: 0.25, ease: 'easeOut' },
      }}
      transition={{
        delay: index * 0.04,
        duration: 0.18,
        backgroundColor: isNew ? { duration: 1, ease: 'easeOut', delay: 0.2 } : undefined,
      }}
      className={`group flex items-center rounded-md px-2 py-2 ${index % 2 === 1 ? 'bg-[var(--color-bg-tertiary)]' : ''}`}
    >
      <span className="w-20 shrink-0 truncate text-xs font-medium text-[var(--color-text-tertiary)]">
        {trait.label}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm text-[var(--color-text-primary)]">{trait.value}</span>
        <PokedexTraitHistory currentValue={trait.value} history={trait.history} />
      </div>
      <div className="flex gap-0.5 transition-opacity lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover:opacity-100">
        <button
          onClick={() => onEdit(trait)}
          className="rounded-lg p-2 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)] lg:p-1"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={() => onDelete(trait.id)}
          className="rounded-lg p-2 text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger-hover-bg)] hover:text-[var(--color-miss)] lg:p-1"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  )
}
