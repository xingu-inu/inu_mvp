'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { Input, Textarea } from '@/components/ui'
import { SampleChips } from '@/features/roadmap/components/shared/sample-chips'
import { useCreateProfileTrait } from '@/queries/use-profile-traits'
import { TRAIT_PRESETS } from './trait-presets'

interface PokedexAddTraitProps {
  onClose: () => void
  initialLabel?: string
}

export function PokedexAddTrait({ onClose, initialLabel }: PokedexAddTraitProps) {
  const [label, setLabel] = useState(initialLabel ?? '')
  const [value, setValue] = useState('')

  const labelRef = useRef<HTMLInputElement>(null)
  const createTrait = useCreateProfileTrait()

  useEffect(() => {
    labelRef.current?.focus()
  }, [])

  const selectedPreset = TRAIT_PRESETS.find((p) => p.label === label)
  const valuePresets = selectedPreset?.values ?? []
  const canSubmit = label.trim().length > 0 && value.trim().length > 0 && !createTrait.isPending

  const handleSelectPreset = (presetLabel: string) => {
    setLabel((prev) => (prev === presetLabel ? '' : presetLabel))
    setValue('')
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    createTrait.mutate(
      { label: label.trim(), value: value.trim(), category: 'general' },
      { onSuccess: () => onClose() }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="space-y-2 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-3">
      <div className="space-y-1.5">
        <SampleChips
          items={TRAIT_PRESETS.map((p) => p.label)}
          selectedValue={label}
          onToggle={handleSelectPreset}
          preventBlur
        />
        <Input
          ref={labelRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={50}
          placeholder="항목 이름"
        />
      </div>
      <div className="space-y-1.5">
        {valuePresets.length > 0 && (
          <SampleChips
            items={valuePresets}
            selectedValue={value}
            onToggle={(val) => setValue((prev) => (prev === val ? '' : val))}
            preventBlur
          />
        )}
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={500}
          className="min-h-[60px]"
          placeholder="내용"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={createTrait.isPending}
          className="rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
        >
          <X className="inline h-3.5 w-3.5" /> 취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="rounded-lg bg-[var(--color-primary-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-600)] disabled:opacity-50"
        >
          <Check className="inline h-3.5 w-3.5" /> 추가
        </button>
      </div>
    </div>
  )
}
