'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Chip, Input } from '@/components/ui'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { LIFESTYLE_OPTIONS, VALUE_OPTIONS } from '@/lib/constants/onboarding'
import { useStepKeyboard } from '../hooks/use-step-keyboard'
import { Plus, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ValuesStep() {
  const {
    selectedLifestyles,
    selectedValues,
    customLifestyle,
    customValue,
    setLifestyles,
    setValues,
    setCustomLifestyle,
    setCustomValue,
    generateDirection,
    nextStep,
    prevStep,
  } = useOnboardingStore()

  const [showCustomLifestyle, setShowCustomLifestyle] = useState(!!customLifestyle)
  const [showCustomValue, setShowCustomValue] = useState(!!customValue)
  const [customLifestyleInput, setCustomLifestyleInput] = useState(customLifestyle || '')
  const [customValueInput, setCustomValueInput] = useState(customValue || '')

  const toggleLifestyle = (id: string) => {
    if (selectedLifestyles.includes(id)) {
      setLifestyles(selectedLifestyles.filter((l) => l !== id))
    } else {
      setLifestyles([...selectedLifestyles, id])
    }
  }

  const totalValueCount = selectedValues.length + (customValue ? 1 : 0)

  const toggleValue = (id: string) => {
    if (selectedValues.includes(id)) {
      setValues(selectedValues.filter((v) => v !== id))
    } else if (totalValueCount < 3) {
      setValues([...selectedValues, id])
    }
  }

  const handleCustomLifestyleChange = (value: string) => {
    setCustomLifestyleInput(value)
    setCustomLifestyle(value.trim() || null)
  }

  const handleCustomValueChange = (value: string) => {
    setCustomValueInput(value)
    if (value.trim()) {
      if (!customValue && selectedValues.length >= 3) return
      setCustomValue(value.trim())
    } else {
      setCustomValue(null)
    }
  }

  const hasLifestyleSelection = selectedLifestyles.length > 0 || !!customLifestyle
  const hasValueSelection = selectedValues.length > 0 || !!customValue
  const canProceed = hasLifestyleSelection && hasValueSelection

  const handleNext = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'values' })
    generateDirection()
    nextStep()
  }

  useStepKeyboard({ onNext: canProceed ? handleNext : undefined, onBack: prevStep, canProceed })

  return (
    <div className="flex flex-1 flex-col">
      {/* Section 1: Lifestyles */}
      <section className="mb-6">
        <h2 className="mb-2 text-xl font-bold text-[var(--color-text-primary)]">
          어떤 삶이 당신을 행복하게 하나요?
        </h2>
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">여러 개 선택할 수 있어요</p>

        <div className="flex flex-wrap gap-2">
          {LIFESTYLE_OPTIONS.map((option, i) => (
            <motion.span
              key={option.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileTap={{ scale: 0.95 }}
            >
              <Chip
                variant="selection"
                selected={selectedLifestyles.includes(option.id)}
                onClick={() => toggleLifestyle(option.id)}
                emoji={option.emoji}
              >
                {option.label}
              </Chip>
            </motion.span>
          ))}

          {!showCustomLifestyle ? (
            <Chip
              variant="selection"
              selected={false}
              onClick={() => setShowCustomLifestyle(true)}
              className="border-dashed"
            >
              <Plus className="h-4 w-4" />
              직접 입력
            </Chip>
          ) : (
            <Input
              value={customLifestyleInput}
              onChange={(e) => handleCustomLifestyleChange(e.target.value)}
              placeholder="직접 입력..."
              className={cn(
                'h-10 w-40 rounded-full',
                customLifestyleInput.trim()
                  ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                  : ''
              )}
              autoFocus
            />
          )}
        </div>

        {/* Inline encouragement */}
        <AnimatePresence>
          {hasLifestyleSelection && (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-3 text-sm text-[var(--color-text-secondary)]"
            >
              🎯 좋은 선택이에요!
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      {/* Section 2: Values - Progressive Disclosure */}
      <AnimatePresence>
        {hasLifestyleSelection && (
          <motion.section
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="mb-6 flex-1 overflow-hidden"
          >
            <h2 className="mb-2 text-xl font-bold text-[var(--color-text-primary)]">
              가장 중요하게 생각하는 가치는?
            </h2>
            <p className="mb-4 text-sm text-[var(--color-text-secondary)]">2~3개 선택해주세요</p>

            <div className="flex flex-wrap gap-2">
              {VALUE_OPTIONS.map((option, i) => (
                <motion.span
                  key={option.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Chip
                    variant="selection"
                    selected={selectedValues.includes(option.id)}
                    onClick={() => toggleValue(option.id)}
                    emoji={option.emoji}
                  >
                    {option.label}
                  </Chip>
                </motion.span>
              ))}

              {!showCustomValue ? (
                <Chip
                  variant="selection"
                  selected={false}
                  onClick={() => setShowCustomValue(true)}
                  className="border-dashed"
                >
                  <Plus className="h-4 w-4" />
                  직접 입력
                </Chip>
              ) : (
                <Input
                  value={customValueInput}
                  onChange={(e) => handleCustomValueChange(e.target.value)}
                  placeholder="직접 입력..."
                  className={cn(
                    'h-10 w-32 rounded-full',
                    customValueInput.trim()
                      ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                      : ''
                  )}
                  autoFocus
                />
              )}
            </div>

            {(selectedValues.length > 0 || !!customValue) && (
              <p className="mt-3 text-sm text-[var(--color-text-tertiary)]">
                {selectedValues.length + (customValue ? 1 : 0)}/3 선택됨
              </p>
            )}

            <AnimatePresence>
              {selectedValues.length >= 2 && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-2 text-sm text-[var(--color-text-secondary)]"
                >
                  ✨ 좋아요! 당신에게 중요한 가치들이네요
                </motion.p>
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-auto space-y-2 pt-6">
        <Button onClick={handleNext} disabled={!canProceed} className="w-full">
          다음
        </Button>
        <Button variant="ghost" size="sm" onClick={prevStep} className="w-full gap-1">
          <ChevronLeft className="h-4 w-4" />
          이전으로
        </Button>
      </div>
    </div>
  )
}
