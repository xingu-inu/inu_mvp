'use client'

import { useState } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SampleChips } from '@/features/roadmap/components/shared/sample-chips'
import { cn } from '@/lib/utils'
import { useCreateArea } from '@/queries/use-areas'
import { useDirection } from '@/queries/use-direction'
import { useAiWhySuggestions } from '@/hooks/use-ai-why-suggestions'
import { AiSuggestionPanel } from '@/components/common/ai-suggestion-panel'
import {
  AREA_PRESETS_EXTENDED,
  AREA_COLOR_PRESETS,
  SAMPLE_AREA_WHYS,
} from '@/lib/constants/onboarding'
import { EmojiPicker } from '@/components/common/emoji-picker'
import type { AreaType } from '@/types/entities'

interface InlineAreaCreateProps {
  existingAreaTypes: (AreaType | undefined)[]
  onDone: (newAreaId?: string) => void
}

export function InlineAreaCreate({ existingAreaTypes, onDone }: InlineAreaCreateProps) {
  const createArea = useCreateArea()
  const { data: direction } = useDirection()
  const aiWhy = useAiWhySuggestions({ target: 'area-why' })
  const [isCustom, setIsCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customEmoji, setCustomEmoji] = useState('')
  const [customColor, setCustomColor] = useState<string>(AREA_COLOR_PRESETS[0])
  const [customWhy, setCustomWhy] = useState('')

  const availablePresets = AREA_PRESETS_EXTENDED.filter((p) => !existingAreaTypes.includes(p.type))
  const sampleWhys = SAMPLE_AREA_WHYS['custom'] ?? []

  const handleWhyGenerate = () => {
    aiWhy.generate({
      direction: direction?.statement,
      areaName: customName || undefined,
    })
  }

  const handlePresetCreate = (preset: (typeof AREA_PRESETS_EXTENDED)[number]) => {
    createArea.mutate(
      { name: preset.name, type: preset.type, emoji: preset.emoji, color: preset.color },
      { onSuccess: (newArea) => onDone(newArea?.id) }
    )
  }

  const handleCustomCreate = () => {
    if (!customName.trim() || !customEmoji.trim()) return
    createArea.mutate(
      {
        name: customName.trim(),
        type: 'custom' as AreaType,
        emoji: customEmoji.trim(),
        color: customColor,
        why: customWhy.trim() || undefined,
      },
      { onSuccess: (newArea) => onDone(newArea?.id) }
    )
  }

  const resetCustom = () => {
    setIsCustom(false)
    setCustomName('')
    setCustomEmoji('')
    setCustomColor(AREA_COLOR_PRESETS[0])
    setCustomWhy('')
    aiWhy.reset()
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      style={{ overflow: 'hidden' }}
    >
      <div className="space-y-3 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-primary-600)]">
          <Plus className="h-3.5 w-3.5" />새 영역 추가
        </div>

        {!isCustom ? (
          <>
            {availablePresets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {availablePresets.map((preset) => (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => handlePresetCreate(preset)}
                    disabled={createArea.isPending}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                      'border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]',
                      'hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-secondary)]',
                      'disabled:opacity-50'
                    )}
                  >
                    <span>{preset.emoji}</span>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 gap-1"
                onClick={() => onDone()}
              >
                <X className="h-3.5 w-3.5" />
                취소
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 gap-1"
                onClick={() => setIsCustom(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                직접 만들기
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <EmojiPicker value={customEmoji} onSelect={setCustomEmoji} />
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="영역 이름"
                className="flex-1"
                maxLength={50}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {AREA_COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setCustomColor(color)}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-all',
                    customColor === color
                      ? 'scale-110 border-[var(--color-text-primary)]'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="space-y-1.5">
              <Input
                value={customWhy}
                onChange={(e) => setCustomWhy(e.target.value)}
                placeholder="이 영역이 왜 중요한가요? (선택)"
                className="text-sm"
              />
              <SampleChips
                items={sampleWhys}
                selectedValue={customWhy}
                onToggle={(val) => setCustomWhy(customWhy === val ? '' : val)}
              />
              <AiSuggestionPanel
                triggerLabel="AI 도움받기"
                isLoading={aiWhy.isLoading}
                error={aiWhy.error}
                suggestions={aiWhy.suggestions}
                selectedValue={customWhy}
                onSelect={(s) => setCustomWhy(s.text)}
                onGenerate={handleWhyGenerate}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 gap-1"
                onClick={resetCustom}
              >
                <X className="h-3.5 w-3.5" />
                취소
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="flex-1 gap-1"
                onClick={handleCustomCreate}
                disabled={!customName.trim() || !customEmoji.trim()}
                isLoading={createArea.isPending}
              >
                <Check className="h-3.5 w-3.5" />
                만들기
              </Button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
