'use client'

import { motion } from 'framer-motion'
import type { TraitCategory, ProfileTrait } from '@/types/entities'

const SUGGESTIONS: {
  category: TraitCategory
  label: string
  prompt: string
  emoji: string
  hint: string
}[] = [
  {
    category: 'identity',
    label: 'MBTI',
    prompt: 'MBTI를 추가해보세요',
    emoji: '🧬',
    hint: '성격 유형',
  },
  {
    category: 'stats',
    label: '강점',
    prompt: '나의 강점은?',
    emoji: '💪',
    hint: '능력/강점',
  },
  {
    category: 'interests',
    label: '관심사',
    prompt: '요즘 관심사가 뭐예요?',
    emoji: '🎯',
    hint: '관심사',
  },
  {
    category: 'description',
    label: '올해의 테마',
    prompt: '올해의 테마를 적어보세요',
    emoji: '💭',
    hint: '자기 소개',
  },
  {
    category: 'habits',
    label: '루틴',
    prompt: '나만의 루틴이 있나요?',
    emoji: '🔄',
    hint: '습관/루틴',
  },
  {
    category: 'general',
    label: '',
    prompt: '자유롭게 기록해보세요',
    emoji: '📝',
    hint: '기타',
  },
]

interface PokedexEmptySlotsProps {
  traits: ProfileTrait[]
  onAddTrait: (category: TraitCategory, suggestedLabel?: string) => void
}

export function PokedexEmptySlots({ traits, onAddTrait }: PokedexEmptySlotsProps) {
  const total = traits.length

  const maxSlots = total === 0 ? 3 : total < 5 ? 2 : total < 10 ? 1 : 0
  if (maxSlots === 0) return null

  const filledCategories = new Set(traits.map((t) => t.category))
  const available = SUGGESTIONS.filter((s) => !filledCategories.has(s.category))
  const slots = available.slice(0, maxSlots)

  if (slots.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="px-1 text-[10px] font-semibold tracking-[0.15em] text-[var(--color-text-disabled)] uppercase">
        미발견 항목
      </p>
      {slots.map((s, i) => (
        <motion.button
          key={s.category}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.22 }}
          onClick={() => onAddTrait(s.category, s.label || undefined)}
          className="group relative w-full overflow-hidden rounded-xl border border-dashed border-[var(--color-border)] transition-all hover:border-[var(--color-primary-300)]"
          style={{
            background: `linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%)`,
          }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {/* Subtle diagonal stripe pattern for "undiscovered" feel */}
          <div
            className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
            style={{
              background: `linear-gradient(135deg, var(--color-primary-50) 0%, transparent 60%)`,
            }}
          />

          <div className="relative flex items-center gap-3 px-4 py-3">
            {/* Silhouette icon circle */}
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--color-border)] transition-colors group-hover:border-[var(--color-primary-200)]"
              style={{ background: 'var(--color-bg-canvas)' }}
            >
              <span className="text-base leading-none opacity-40 transition-opacity group-hover:opacity-80">
                {s.emoji}
              </span>
            </div>

            <div className="flex-1 text-left">
              <p className="text-[10px] font-medium tracking-wider text-[var(--color-text-disabled)] uppercase transition-colors group-hover:text-[var(--color-text-tertiary)]">
                {s.hint}
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-text-tertiary)] transition-colors group-hover:text-[var(--color-text-secondary)]">
                {s.prompt}
              </p>
            </div>

            {/* "?" badge on right */}
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--color-border)] transition-all group-hover:border-[var(--color-primary-300)] group-hover:bg-[var(--color-primary-50)]">
              <span className="font-mono text-xs font-bold text-[var(--color-text-disabled)] transition-colors group-hover:text-[var(--color-primary-500)]">
                +
              </span>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  )
}
