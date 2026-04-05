'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Check, Plus } from 'lucide-react'
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
  onTraitAdded?: () => void
}

export function PokedexAddTrait({ onClose, onTraitAdded }: PokedexAddTraitProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [customLabel, setCustomLabel] = useState('')
  const [value, setValue] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const customLabelRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef<HTMLInputElement>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
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

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const handlePresetChange = (val: string) => {
    setSelectedPreset(val)
    setValue('')
    if (val !== CUSTOM_LABEL_KEY) {
      setTimeout(() => valueRef.current?.focus(), 0)
    }
  }

  const flashSuccess = useCallback(() => {
    setShowSuccess(true)
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    successTimerRef.current = setTimeout(() => setShowSuccess(false), 600)
  }, [])

  const handleSubmit = () => {
    if (!canSubmit) return
    createTrait.mutate({ label: resolvedLabel, value: value.trim(), category: 'general' })
    // Reset form immediately (optimistic update handles the UI)
    setValue('')
    flashSuccess()
    onTraitAdded?.()
    setTimeout(() => valueRef.current?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.target === valueRef.current || e.target === customLabelRef.current) {
        e.preventDefault()
        handleSubmit()
      }
    }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="space-y-2 px-3 pb-3">
      {/* Mobile: 2 rows. Desktop: single row */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        {isCustomMode ? (
          <Input
            ref={customLabelRef}
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={50}
            placeholder="항목 이름"
            className="h-9 text-xs lg:w-28 lg:shrink-0"
          />
        ) : (
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="h-9 text-xs lg:w-28 lg:shrink-0">
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

        <div className="flex items-center gap-2">
          <Input
            ref={valueRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
            placeholder="내용"
            className={`h-9 min-w-0 flex-1 text-xs transition-[border-color,box-shadow] duration-300 ${showSuccess ? 'border-emerald-400 shadow-[0_0_0_1px_theme(colors.emerald.400)]' : ''}`}
          />
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white transition-colors ${showSuccess ? 'bg-emerald-500' : 'bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)]'} disabled:opacity-40`}
          >
            {showSuccess ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
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

      {/* Bottom row: back to presets (custom mode) + done button */}
      <div className="flex items-center justify-between">
        {isCustomMode ? (
          <button
            onClick={() => {
              setSelectedPreset('')
              setCustomLabel('')
            }}
            className="min-h-[44px] text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          >
            프리셋에서 선택하기
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={onClose}
          className="min-h-[44px] text-[10px] font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
        >
          완료
        </button>
      </div>
    </div>
  )
}
