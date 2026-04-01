'use client'

import { motion } from 'framer-motion'
import { Pencil, Trash2, Plus, Compass } from 'lucide-react'
import type { ProfileTrait, TraitCategory } from '@/types/entities'

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return '방금 전'
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}주 전`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}개월 전`
  return `${Math.floor(months / 12)}년 전`
}

interface PokedexInterestsProps {
  traits: ProfileTrait[]
  onEditTrait: (trait: ProfileTrait) => void
  onDeleteTrait: (id: string) => void
  onAddTrait: (category: TraitCategory) => void
}

export function PokedexInterests({
  traits,
  onEditTrait,
  onDeleteTrait,
  onAddTrait,
}: PokedexInterestsProps) {
  if (traits.length === 0) return null

  const showEmptySlot = traits.length % 2 !== 0

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
            background: 'oklch(60% 0.1 190 / 12%)',
            border: '1px solid oklch(60% 0.1 190 / 20%)',
          }}
        >
          <Compass className="h-3 w-3" style={{ color: 'var(--color-area-hobbies)' }} />
        </div>
        <p className="text-[10px] font-semibold tracking-[0.15em] text-[var(--color-text-tertiary)] uppercase">
          관심사
        </p>
        <div className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
        <span className="font-mono text-[10px] text-[var(--color-text-disabled)]">
          {traits.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {traits.map((trait, i) => (
          <motion.div
            key={trait.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className="group relative rounded-lg border border-[var(--color-border)] p-3 transition-all hover:border-[var(--color-primary-200)] hover:shadow-sm"
            style={{ background: 'var(--color-bg-primary)' }}
          >
            {/* Accent top line */}
            <div
              className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background: 'linear-gradient(90deg, var(--color-area-hobbies), transparent)',
              }}
            />
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
              {trait.label}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">
              {trait.value}
            </p>
            <p className="mt-1.5 text-[10px] text-[var(--color-text-disabled)]">
              {getRelativeTime(trait.created_at)}
            </p>
            <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => onEditTrait(trait)}
                className="rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDeleteTrait(trait.id)}
                className="rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger-hover-bg)] hover:text-[var(--color-miss)]"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        ))}
        {showEmptySlot && (
          <button
            onClick={() => onAddTrait('interests')}
            className="group flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--color-border)] p-3 transition-all hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-[var(--color-border)] transition-colors group-hover:border-[var(--color-primary-300)]">
              <Plus className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary-500)]" />
            </div>
            <span className="text-xs text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary-500)]">
              관심사 추가
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
