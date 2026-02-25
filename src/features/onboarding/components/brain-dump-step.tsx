'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, X } from 'lucide-react'
import { Button, Chip } from '@/components/ui'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { GOAL_CHIP_OPTIONS, GOAL_CHIP_CATEGORIES } from '@/lib/constants/onboarding'
import { useStepKeyboard } from '../hooks/use-step-keyboard'

export function BrainDumpStep() {
  const {
    selectedGoalChips,
    customGoals,
    toggleGoalChip,
    addCustomGoal,
    removeCustomGoal,
    organizeAndPrepareGoals,
    nextStep,
    prevStep,
  } = useOnboardingStore()

  const [freeText, setFreeText] = useState('')

  // Parse textarea lines into goal count for display
  const freeTextGoals = useMemo(
    () =>
      freeText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    [freeText]
  )

  const totalCount = selectedGoalChips.length + customGoals.length + freeTextGoals.length
  const canProceed = totalCount >= 1

  const handleNext = () => {
    // Add free text lines as custom goals before organizing
    for (const line of freeTextGoals) {
      if (!customGoals.includes(line)) {
        addCustomGoal(line)
      }
    }
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'brain-dump' })
    // Use setTimeout to let addCustomGoal state updates settle
    setTimeout(() => {
      organizeAndPrepareGoals()
      nextStep()
    }, 0)
  }

  useStepKeyboard({ onNext: canProceed ? handleNext : undefined, onBack: prevStep, canProceed })

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-1 text-xl font-bold text-[var(--color-text-primary)]">
        하고 싶은 것들을 쏟아내 보세요!
      </h2>
      <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
        골라도 좋고, 자유롭게 적어도 좋아요
      </p>

      {/* Chip grid - grouped by category */}
      <div className="space-y-4">
        {GOAL_CHIP_CATEGORIES.map((category) => {
          const categoryChips = GOAL_CHIP_OPTIONS.filter(
            (option) => option.areaType === category.areaType
          )
          let runningIndex = 0
          for (const cat of GOAL_CHIP_CATEGORIES) {
            if (cat.areaType === category.areaType) break
            runningIndex += GOAL_CHIP_OPTIONS.filter((o) => o.areaType === cat.areaType).length
          }

          return (
            <div key={category.areaType}>
              <p className="mb-1.5 text-xs font-medium text-[var(--color-text-tertiary)]">
                {category.emoji} {category.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {categoryChips.map((option, i) => (
                  <motion.span
                    key={option.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (runningIndex + i) * 0.04 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Chip
                      variant="selection"
                      selected={selectedGoalChips.includes(option.id)}
                      onClick={() => toggleGoalChip(option.id)}
                      emoji={option.emoji}
                    >
                      {option.label}
                    </Chip>
                  </motion.span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Free text input */}
      <div className="mt-6">
        <p className="mb-2 text-xs font-medium text-[var(--color-text-tertiary)]">
          또는 자유롭게 적어보세요
        </p>
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder={'운동 꾸준히 하고 싶다\n영어 공부 다시 시작하기\n매일 책 30분 읽기'}
          rows={4}
          className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary-500)] focus:outline-none"
        />
        {freeTextGoals.length > 0 && (
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {freeTextGoals.length}개 입력됨
          </p>
        )}
      </div>

      {/* Custom goals as removable chips */}
      <AnimatePresence>
        {customGoals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex flex-wrap gap-2 overflow-hidden"
          >
            {customGoals.map((goal, index) => (
              <motion.span
                key={`custom-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileTap={{ scale: 0.95 }}
              >
                <Chip variant="selection" selected={true} onClick={() => removeCustomGoal(index)}>
                  {goal}
                  <X className="ml-1 h-3 w-3" />
                </Chip>
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection counter */}
      <AnimatePresence>
        {totalCount > 0 && (
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mt-4 text-sm text-[var(--color-text-secondary)]"
          >
            {totalCount}개 선택했어요!
          </motion.p>
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
