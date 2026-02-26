'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'

import { Button, Chip } from '@/components/ui'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { GOAL_CHIP_CATEGORIES, GOAL_CHIP_OPTIONS } from '@/lib/constants/onboarding'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { useStepKeyboard } from '../hooks/use-step-keyboard'

function uniqueGoals(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of values) {
    const value = raw.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }

  return result
}

export function GoalCaptureStep() {
  const {
    selectedGoalChips,
    customGoals,
    toggleGoalChip,
    mergeCustomGoals,
    organizeAndPrepareGoals,
    nextStep,
    prevStep,
  } = useOnboardingStore()

  const [freeText, setFreeText] = useState('')

  const freeTextGoals = useMemo(
    () =>
      uniqueGoals(
        freeText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
      ),
    [freeText]
  )

  const mergedCustomGoals = useMemo(
    () => uniqueGoals([...customGoals, ...freeTextGoals]),
    [customGoals, freeTextGoals]
  )

  const totalCount = selectedGoalChips.length + mergedCustomGoals.length
  const exceedsLimit = totalCount > 5
  const canProceed = totalCount >= 1 && !exceedsLimit

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_VIEWED, { step: 'goal-capture' })
  }, [])

  const handleBack = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_BACK, { step: 'goal-capture' })
    prevStep()
  }

  const handleNext = () => {
    if (!canProceed) return

    mergeCustomGoals(freeTextGoals)
    organizeAndPrepareGoals()
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_NEXT, {
      step: 'goal-capture',
      selected_goal_count: totalCount,
    })
    nextStep()
  }

  useStepKeyboard({ onNext: canProceed ? handleNext : undefined, onBack: handleBack, canProceed })

  return (
    <div className="flex flex-1 flex-col">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
          어떤 목표를 먼저 잡아볼까요?
        </h2>
        <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
          고르거나 직접 입력해서 1~5개만 담아주세요.
        </p>
      </div>

      <div className="space-y-4 pb-6">
        {GOAL_CHIP_CATEGORIES.map((category) => {
          const categoryChips = GOAL_CHIP_OPTIONS.filter(
            (option) => option.areaType === category.areaType
          )

          return (
            <div key={category.areaType}>
              <p className="mb-1.5 text-xs font-medium text-[var(--color-text-tertiary)]">
                {category.emoji} {category.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {categoryChips.map((option, index) => {
                  const selected = selectedGoalChips.includes(option.id)
                  const disabled = !selected && totalCount >= 5

                  return (
                    <motion.span
                      key={option.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Chip
                        variant="selection"
                        selected={selected}
                        onClick={() => {
                          if (disabled) return
                          toggleGoalChip(option.id)
                        }}
                        emoji={option.emoji}
                      >
                        {option.label}
                      </Chip>
                    </motion.span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mb-5">
        <p className="mb-2 text-xs font-medium text-[var(--color-text-tertiary)]">직접 적기</p>
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder={'운동 꾸준히 하기\n영어 공부 다시 시작하기\n매일 책 20분 읽기'}
          rows={4}
          className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary-500)] focus:outline-none"
        />
      </div>

      <div className="sticky bottom-0 mt-auto border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]/95 pt-4 pb-1 backdrop-blur">
        <p className="mb-2 text-xs text-[var(--color-text-tertiary)]">
          {totalCount}/5개 선택
          {exceedsLimit ? ' (최대 5개까지 가능해요)' : ''}
        </p>
        <div className="space-y-2">
          <Button onClick={handleNext} disabled={!canProceed} className="h-11 w-full">
            다음
          </Button>
          <Button variant="ghost" size="sm" onClick={handleBack} className="w-full gap-1">
            <ChevronLeft className="h-4 w-4" />
            이전으로
          </Button>
        </div>
      </div>
    </div>
  )
}
