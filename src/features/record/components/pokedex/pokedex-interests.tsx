'use client'

import { motion } from 'framer-motion'
import { Pencil, Trash2, Compass } from 'lucide-react'
import type { ProfileTrait, TraitCategory } from '@/types/entities'
import { PokedexTraitHistory } from './pokedex-trait-history'

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
  return (
    <div className="border-t border-[var(--color-border)] px-4 py-3">
      {/* Section header */}
      <div className="mb-2 flex items-center gap-2">
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

      {traits.length > 0 ? (
        <div>
          {traits.map((trait, i) => (
            <motion.div
              key={trait.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.18 }}
              className={`group flex items-center px-2 py-2 ${i % 2 === 1 ? 'rounded-md bg-[var(--color-bg-tertiary)]' : ''}`}
            >
              <span className="w-20 shrink-0 truncate text-xs font-medium text-[var(--color-text-tertiary)]">
                {trait.label}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm text-[var(--color-text-primary)]">
                  {trait.value}
                </span>
                <PokedexTraitHistory currentValue={trait.value} history={trait.history} />
              </div>
              <span className="ml-2 shrink-0 text-[10px] text-[var(--color-text-disabled)]">
                {getRelativeTime(trait.created_at)}
              </span>
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
        <div className="flex items-center px-2 py-2">
          <span className="w-20 shrink-0 text-xs font-medium text-[var(--color-text-disabled)]">
            ???
          </span>
          <span className="text-sm text-[var(--color-text-disabled)]">미발견</span>
        </div>
      )}

      <button
        onClick={() => onAddTrait('interests')}
        className="mt-2 w-full py-1.5 text-center text-xs font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)]"
      >
        + 관심사 추가
      </button>
    </div>
  )
}
