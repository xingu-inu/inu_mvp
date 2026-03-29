'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { Button, Chip } from '@/components/ui'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { DIRECTION_CHIP_OPTIONS } from '@/lib/constants/onboarding'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useStepKeyboard } from '../hooks/use-step-keyboard'
import { useCompleteOnboarding } from '../hooks/use-complete-onboarding'

export function DirectionStepV5() {
  const { v5DirectionChips, v5ReviewAreas, toggleV5DirectionChip, prevStep } = useOnboardingStore()
  const { complete, isPending, error } = useCompleteOnboarding()

  // Suggest chips based on area types from review
  const suggestedChipIds = useMemo(() => {
    const areaTypes = new Set(v5ReviewAreas.filter((a) => a._checked).map((a) => a.type))
    const suggestions: string[] = []

    if (areaTypes.has('health')) suggestions.push('health-vitality')
    if (areaTypes.has('career') || areaTypes.has('learning')) suggestions.push('growth-challenge')
    if (areaTypes.has('finance')) suggestions.push('financial-freedom')
    if (areaTypes.has('relationships')) suggestions.push('warm-relationships')
    if (areaTypes.has('hobbies')) suggestions.push('creative-joy')
    if (areaTypes.has('mental')) suggestions.push('inner-peace')

    return new Set(suggestions)
  }, [v5ReviewAreas])

  const canProceed = v5DirectionChips.length > 0

  const directionPreview = useMemo(() => {
    if (v5DirectionChips.length === 0) return null
    const labels = DIRECTION_CHIP_OPTIONS.filter((c) => v5DirectionChips.includes(c.id)).map(
      (c) => c.statement
    )
    return labels.join(', ') + ' 살고 싶다'
  }, [v5DirectionChips])

  const handleStart = async () => {
    if (!canProceed || isPending) return
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'direction-v5' })
    await complete()
  }

  const handleSkip = async () => {
    if (isPending) return
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'direction-v5', skipped: true })
    await complete()
  }

  useStepKeyboard({ onNext: canProceed ? handleStart : undefined, onBack: prevStep, canProceed })

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-5">
        <h2 className="mb-1 text-xl font-bold text-[var(--color-text-primary)]">
          어떤 삶을 살고 싶으세요?
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          방금 정리한 것들을 보면 어떤 방향인지 보이지 않나요?
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {DIRECTION_CHIP_OPTIONS.map((option, i) => {
          const isSuggested = suggestedChipIds.has(option.id)
          const isSelected = v5DirectionChips.includes(option.id)

          return (
            <motion.span
              key={option.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              {isSuggested && !isSelected && (
                <span className="absolute -top-1 -right-1 z-10 h-2 w-2 rounded-full bg-[var(--color-primary-400)]" />
              )}
              <Chip
                variant="selection"
                selected={isSelected}
                onClick={() => toggleV5DirectionChip(option.id)}
                emoji={option.emoji}
              >
                {option.label}
              </Chip>
            </motion.span>
          )
        })}
      </div>

      {/* Direction preview */}
      <AnimatePresence>
        {directionPreview && (
          <motion.div
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 8, height: 0 }}
            className="mt-6 overflow-hidden"
          >
            <div className="rounded-xl bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-ai-bg)] p-4">
              <p className="mb-1 text-xs font-medium text-[var(--color-text-tertiary)]">
                나의 방향
              </p>
              <p className="font-serif text-base leading-relaxed text-[var(--color-text-primary)]">
                &ldquo;{directionPreview}&rdquo;
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="mt-4 rounded-xl bg-[var(--color-miss-bg)] p-3 text-sm text-[var(--color-miss)]">
          {error}
          <Button variant="secondary" size="sm" onClick={handleStart} className="mt-2">
            다시 시도
          </Button>
        </div>
      )}

      <div className="mt-auto space-y-2 pt-6">
        <Button
          onClick={handleStart}
          disabled={!canProceed || isPending}
          className="w-full"
          size="lg"
        >
          {isPending ? '설정 중...' : '시작하기'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          disabled={isPending}
          className="w-full"
        >
          나중에 설정할게요
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={prevStep}
          disabled={isPending}
          className="w-full gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          이전으로
        </Button>
      </div>
    </div>
  )
}
