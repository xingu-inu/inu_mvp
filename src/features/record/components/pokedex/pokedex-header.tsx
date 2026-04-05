'use client'

import { motion } from 'framer-motion'
import { PokedexAvatarPicker, getAvatarEmoji } from './pokedex-avatar-picker'

const MAX_TRAITS = 30

function getMilestoneLabel(count: number): string {
  if (count === 0) return ''
  if (count <= 5) return '🌱 씨앗'
  if (count <= 10) return '🌿 새싹'
  if (count <= 20) return '🌳 나무'
  return '🌲 숲'
}

interface PokedexHeaderProps {
  traitCount: number
  nickname: string | null
  avatarPreset: string | null
  onAvatarChange: (preset: string) => void
}

export function PokedexHeader({
  traitCount,
  nickname,
  avatarPreset,
  onAvatarChange,
}: PokedexHeaderProps) {
  const dexNumber = String(traitCount).padStart(3, '0')
  const completionPercent = Math.min((traitCount / MAX_TRAITS) * 100, 100)
  const milestone = getMilestoneLabel(traitCount)

  return (
    <div className="p-3">
      {/* Hero row: avatar + info */}
      <div className="mb-2 flex items-start gap-3">
        {/* Avatar */}
        <PokedexAvatarPicker selected={avatarPreset} onSelect={onAvatarChange}>
          <button
            type="button"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--color-primary-200)] text-4xl transition-all hover:border-[var(--color-primary-400)] hover:shadow-md"
            style={{
              background:
                'radial-gradient(circle at 35% 35%, var(--color-primary-100), var(--color-bg-tertiary))',
            }}
          >
            {getAvatarEmoji(avatarPreset)}
          </button>
        </PokedexAvatarPicker>

        {/* Name + dex number */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] text-[var(--color-text-tertiary)] uppercase">
                Character Entry
              </p>
              <h2 className="mt-0.5 truncate text-base font-bold text-[var(--color-text-primary)]">
                {nickname ?? '나에 대한 데이터'}
              </h2>
            </div>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-primary-200)]"
              style={{
                background:
                  'radial-gradient(circle at 35% 35%, var(--color-primary-100), var(--color-bg-tertiary))',
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
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
                탐험한 나
              </span>
              {milestone && (
                <span className="text-[10px] text-[var(--color-text-tertiary)]">{milestone}</span>
              )}
            </div>
            <div
              className="relative h-2 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--color-bg-canvas)' }}
            >
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
                  background:
                    'linear-gradient(90deg, var(--color-primary-400), var(--color-primary-500), oklch(56% 0.16 35))',
                  boxShadow: completionPercent > 5 ? '0 0 6px oklch(56% 0.16 35 / 40%)' : 'none',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${completionPercent}%` }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
