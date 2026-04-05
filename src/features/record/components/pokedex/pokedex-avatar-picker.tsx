'use client'

import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

const AVATAR_PRESETS = [
  { id: 'fox', emoji: '🦊' },
  { id: 'cat', emoji: '🐱' },
  { id: 'dog', emoji: '🐶' },
  { id: 'bear', emoji: '🐻' },
  { id: 'panda', emoji: '🐼' },
  { id: 'rabbit', emoji: '🐰' },
  { id: 'penguin', emoji: '🐧' },
  { id: 'owl', emoji: '🦉' },
  { id: 'dragon', emoji: '🐉' },
  { id: 'unicorn', emoji: '🦄' },
] as const

interface PokedexAvatarPickerProps {
  selected: string | null
  onSelect: (presetId: string) => void
  children: React.ReactNode
}

export function PokedexAvatarPicker({ selected, onSelect, children }: PokedexAvatarPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-3">
        <p className="mb-2 text-[10px] font-semibold tracking-[0.15em] text-[var(--color-text-tertiary)] uppercase">
          캐릭터 선택
        </p>
        <div className="grid grid-cols-5 gap-2">
          {AVATAR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-all hover:scale-110 ${
                selected === preset.id
                  ? 'bg-[var(--color-primary-100)] ring-2 ring-[var(--color-primary-400)]'
                  : 'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-canvas)]'
              }`}
            >
              {preset.emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function getAvatarEmoji(presetId: string | null): string {
  if (!presetId) return '👤'
  const preset = AVATAR_PRESETS.find((p) => p.id === presetId)
  return preset?.emoji ?? '👤'
}
