'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Input } from '@/components/ui'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
} from '@/components/ui'
import { SampleChips } from '@/features/roadmap/components/shared/sample-chips'
import { useCreateProfileTrait } from '@/queries/use-profile-traits'
import { TRAIT_PRESETS } from './trait-presets'

const CUSTOM_LABEL_KEY = '__custom__'

interface PokedexAddTraitProps {
  onClose: () => void
}

export function PokedexAddTrait({ onClose }: PokedexAddTraitProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [customLabel, setCustomLabel] = useState('')
  const [value, setValue] = useState('')

  const customLabelRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef<HTMLInputElement>(null)
  const createTrait = useCreateProfileTrait()

  const isCustomMode = selectedPreset === CUSTOM_LABEL_KEY
  const resolvedLabel = isCustomMode ? customLabel.trim() : selectedPreset
  const preset = TRAIT_PRESETS.find((p) => p.label === selectedPreset)
  const valuePresets = preset?.values ?? []
  const canSubmit = resolvedLabel.length > 0 && value.trim().length > 0 && !createTrait.isPending

  useEffect(() => {
    if (isCustomMode) {
      customLabelRef.current?.focus()
    }
  }, [isCustomMode])

  const handlePresetChange = (val: string) => {
    setSelectedPreset(val)
    setValue('')
    if (val !== CUSTOM_LABEL_KEY) {
      // Focus value input after selecting a preset
      setTimeout(() => valueRef.current?.focus(), 0)
    }
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    createTrait.mutate(
      { label: resolvedLabel, value: value.trim(), category: 'general' },
      { onSuccess: () => onClose() }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Only submit from Input elements, not from Select internals
      if (e.target === valueRef.current || e.target === customLabelRef.current) {
        e.preventDefault()
        handleSubmit()
      }
    }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="space-y-2 px-3 pb-3">
      {/* Inline row: label select/input + value input + add button */}
      <div className="flex items-center gap-2">
        {/* Label: dropdown or custom input */}
        {isCustomMode ? (
          <Input
            ref={customLabelRef}
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={50}
            placeholder="항목 이름"
            className="h-9 w-28 shrink-0 text-xs"
          />
        ) : (
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="h-9 w-28 shrink-0 text-xs">
              <SelectValue placeholder="항목 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TRAIT_PRESETS.map((p) => (
                  <SelectItem key={p.label} value={p.label} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
                <SelectItem
                  value={CUSTOM_LABEL_KEY}
                  className="text-xs text-[var(--color-text-tertiary)]"
                >
                  직접 입력
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        )}

        {/* Value input */}
        <Input
          ref={valueRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={500}
          placeholder="내용"
          className="h-9 min-w-0 flex-1 text-xs"
        />

        {/* Add button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-500)] text-white transition-colors hover:bg-[var(--color-primary-600)] disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Value presets (if selected preset has predefined values) */}
      {valuePresets.length > 0 && (
        <SampleChips
          items={valuePresets}
          selectedValue={value}
          onToggle={(val) => setValue((prev) => (prev === val ? '' : val))}
          preventBlur
        />
      )}

      {/* Custom mode: back to preset select */}
      {isCustomMode && (
        <button
          onClick={() => {
            setSelectedPreset('')
            setCustomLabel('')
          }}
          className="min-h-[44px] text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
        >
          프리셋에서 선택하기
        </button>
      )}
    </div>
  )
}
