'use client'

import { PokedexAvatarPicker, getAvatarEmoji } from './pokedex-avatar-picker'

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
  const milestone = getMilestoneLabel(traitCount)

  return (
    <div className="p-3">
      {/* Hero row: avatar + info */}
      <div className="flex items-start gap-3">
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
            <h2 className="truncate text-base font-bold text-[var(--color-text-primary)]">
              {nickname ?? '나에 대한 데이터'}
            </h2>
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

          {/* Milestone badge + count */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)]">
              항목 {traitCount}개
            </span>
            {milestone && (
              <span className="text-[10px] text-[var(--color-text-tertiary)]">{milestone}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
