'use client'

import { useState } from 'react'
import { Smile } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { AREA_EMOJI_PRESETS } from '@/lib/constants/emojis'

interface EmojiPickerProps {
  value?: string
  onSelect: (emoji: string) => void
  className?: string
}

export function EmojiPicker({ value, onSelect, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (emoji: string) => {
    onSelect(emoji)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 w-16 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-xl transition-colors',
            'hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-secondary)]',
            className
          )}
        >
          {value || <Smile className="h-5 w-5 text-[var(--color-text-tertiary)]" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {AREA_EMOJI_PRESETS.map((group) => (
            <div key={group.category}>
              <p className="mb-1.5 text-xs font-medium text-[var(--color-text-tertiary)]">
                {group.category}
              </p>
              <div className="flex flex-wrap gap-1">
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelect(emoji)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors',
                      'hover:bg-[var(--color-bg-tertiary)]',
                      value === emoji && 'bg-[var(--color-primary-100)]'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
