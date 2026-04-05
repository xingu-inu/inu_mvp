'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Check, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Input, Textarea } from '@/components/ui'
import { SampleChips } from '@/features/roadmap/components/shared/sample-chips'
import { useCreateProfileTrait } from '@/queries/use-profile-traits'
import { TRAIT_PRESETS } from './trait-presets'
import type { TraitCategory } from '@/types/entities'

interface CategoryOption {
  category: TraitCategory
  emoji: string
  label: string
  placeholderLabel: string
  placeholderValue: string
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    category: 'identity',
    emoji: '🧬',
    label: '성격 유형',
    placeholderLabel: '예: MBTI, 에니어그램',
    placeholderValue: '예: INTJ, 5w4',
  },
  {
    category: 'stats',
    emoji: '💪',
    label: '능력/강점',
    placeholderLabel: '예: 강점, 체력',
    placeholderValue: '예: 몰입력, 분석적 사고',
  },
  {
    category: 'interests',
    emoji: '🎯',
    label: '관심사',
    placeholderLabel: '예: 요즘 관심사, 취미',
    placeholderValue: '예: 클라이밍, 글쓰기',
  },
  {
    category: 'description',
    emoji: '💭',
    label: '자기 소개',
    placeholderLabel: '예: 올해의 테마, 모토',
    placeholderValue: '예: 느리더라도 꾸준히',
  },
  {
    category: 'habits',
    emoji: '🔄',
    label: '습관/루틴',
    placeholderLabel: '예: 아침 루틴, 운동',
    placeholderValue: '예: 6시 기상, 30분 러닝',
  },
  {
    category: 'general',
    emoji: '📝',
    label: '직접 입력',
    placeholderLabel: '항목 이름',
    placeholderValue: '내용',
  },
]

type Step = 'picking' | 'filling'

interface PokedexAddTraitProps {
  onClose: () => void
  initialCategory?: TraitCategory
  initialLabel?: string
}

export function PokedexAddTrait({ onClose, initialCategory, initialLabel }: PokedexAddTraitProps) {
  const [step, setStep] = useState<Step>(initialCategory ? 'filling' : 'picking')
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>(
    initialCategory
      ? (CATEGORY_OPTIONS.find((o) => o.category === initialCategory) ?? CATEGORY_OPTIONS[5])
      : CATEGORY_OPTIONS[0]
  )
  const [label, setLabel] = useState(initialLabel ?? '')
  const [value, setValue] = useState('')

  const labelRef = useRef<HTMLInputElement>(null)
  const createTrait = useCreateProfileTrait()

  useEffect(() => {
    if (step === 'filling') {
      labelRef.current?.focus()
    }
  }, [step])

  const valuePresets = TRAIT_PRESETS.find((p) => p.label === label)?.values ?? []
  const canSubmit = label.trim().length > 0 && value.trim().length > 0 && !createTrait.isPending

  const handleSelectCategory = (option: CategoryOption) => {
    setSelectedCategory(option)
    setStep('filling')
  }

  const handleBack = () => {
    setStep('picking')
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    createTrait.mutate(
      { label: label.trim(), value: value.trim(), category: selectedCategory.category },
      { onSuccess: () => onClose() }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-3">
      <AnimatePresence mode="wait" initial={false}>
        {step === 'picking' ? (
          <motion.div
            key="picking"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
          >
            <p className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
              어떤 걸 기록할까요?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.category}
                  onClick={() => handleSelectCategory(option)}
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] p-3 text-left transition-colors hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)]"
                >
                  <span className="text-base leading-none">{option.emoji}</span>
                  <span className="text-sm text-[var(--color-text-primary)]">{option.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="filling"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              {!initialCategory && (
                <button
                  onClick={handleBack}
                  className="rounded-lg p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
                  aria-label="카테고리 선택으로 돌아가기"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary-200)] bg-white px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
                {selectedCategory.emoji} {selectedCategory.label}
              </span>
            </div>
            <div className="space-y-1.5">
              <SampleChips
                items={TRAIT_PRESETS.map((p) => p.label)}
                selectedValue={label}
                onToggle={(val) => setLabel((prev) => (prev === val ? '' : val))}
                preventBlur
              />
              <Input
                ref={labelRef}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={50}
                placeholder={selectedCategory.placeholderLabel}
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
                placeholder={selectedCategory.placeholderValue}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
