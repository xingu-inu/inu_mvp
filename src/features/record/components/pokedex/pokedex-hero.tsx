'use client'

import { Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ProfileTrait } from '@/types/entities'

const MAX_TRAITS = 30

// Distinct hue rotation per badge index so each type badge has its own color
const BADGE_PALETTES = [
  {
    bg: 'oklch(65% 0.1 300 / 12%)',
    border: 'oklch(65% 0.1 300 / 25%)',
    text: 'var(--color-area-mental)',
  },
  {
    bg: 'oklch(58% 0.14 240 / 12%)',
    border: 'oklch(58% 0.14 240 / 25%)',
    text: 'var(--color-area-career)',
  },
  {
    bg: 'oklch(60% 0.12 160 / 12%)',
    border: 'oklch(60% 0.12 160 / 25%)',
    text: 'var(--color-area-health)',
  },
  {
    bg: 'oklch(65% 0.12 15 / 12%)',
    border: 'oklch(65% 0.12 15 / 25%)',
    text: 'var(--color-area-relationships)',
  },
  {
    bg: 'oklch(68% 0.11 55 / 12%)',
    border: 'oklch(68% 0.11 55 / 25%)',
    text: 'var(--color-area-finance)',
  },
]

interface PokedexHeroProps {
  traits: ProfileTrait[]
  identityTraits: ProfileTrait[]
  onEditTrait: (trait: ProfileTrait) => void
  onDeleteTrait: (id: string) => void
}

export function PokedexHero({
  traits,
  identityTraits,
  onEditTrait,
  onDeleteTrait,
}: PokedexHeroProps) {
  const count = traits.length
  const dexNumber = String(count).padStart(3, '0')
  const completionPercent = Math.min((count / MAX_TRAITS) * 100, 100)

  return (
    <div
      className="rounded-2xl border border-[var(--color-border)] p-4"
      style={{
        background: `linear-gradient(145deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%)`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Top row: title + dex badge */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.15em] text-[var(--color-text-tertiary)] uppercase">
            Character Entry
          </p>
          <h2 className="mt-0.5 text-base font-bold text-[var(--color-text-primary)]">
            나에 대한 데이터
          </h2>
        </div>
        {/* Dex number badge */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-primary-200)]"
          style={{
            background: `radial-gradient(circle at 35% 35%, var(--color-primary-100), var(--color-bg-tertiary))`,
          }}
        >
          <span
            className="font-mono text-[10px] leading-none font-bold text-[var(--color-primary-600)]"
            style={{ letterSpacing: '0.04em' }}
          >
            #{dexNumber}
          </span>
        </div>
      </div>

      {/* Completion gauge */}
      <div className="mb-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
            기록 완성도
          </span>
          <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">
            {count}
            <span className="opacity-50"> / {MAX_TRAITS}</span>
          </span>
        </div>
        <div
          className="relative h-2.5 w-full overflow-hidden rounded-full"
          style={{ background: 'var(--color-bg-canvas)' }}
        >
          {/* Track notches */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full w-px"
              style={{
                left: `${(i + 1) * (100 / 6)}%`,
                background: 'var(--color-bg-primary)',
                opacity: 0.6,
              }}
            />
          ))}
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, var(--color-primary-400), var(--color-primary-500), oklch(56% 0.16 35))`,
              boxShadow: completionPercent > 5 ? '0 0 6px oklch(56% 0.16 35 / 40%)' : 'none',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${completionPercent}%` }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      </div>

      {/* Identity type badges */}
      {identityTraits.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {identityTraits.map((trait, index) => {
            const palette = BADGE_PALETTES[index % BADGE_PALETTES.length]
            const displayText =
              trait.label.length + trait.value.length <= 12
                ? trait.value
                : `${trait.label}: ${trait.value}`
            return (
              <div key={trait.id} className="group relative shrink-0">
                <motion.button
                  onClick={() => onEditTrait(trait)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-full px-3 py-1 text-xs font-semibold transition-shadow hover:shadow-sm"
                  style={{
                    backgroundColor: palette.bg,
                    border: `1.5px solid ${palette.border}`,
                    color: palette.text,
                    letterSpacing: '0.03em',
                  }}
                >
                  {displayText}
                </motion.button>
                <button
                  onClick={() => onDeleteTrait(trait.id)}
                  className="absolute -top-1 -right-1 hidden h-4 w-4 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-miss)] group-hover:flex"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
