'use client'

import { motion } from 'framer-motion'
import { ChevronLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { AREA_PRESETS_EXTENDED } from '@/lib/constants/onboarding'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useStepKeyboard } from '../hooks/use-step-keyboard'

export function PrioritizeStep() {
  const { organizedGoals, activeGoalIds, toggleActiveGoal, nextStep, prevStep } =
    useOnboardingStore()

  const canProceed = activeGoalIds.length >= 1

  const handleNext = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'prioritize' })
    nextStep()
  }

  useStepKeyboard({ onNext: canProceed ? handleNext : undefined, onBack: prevStep, canProceed })

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-2 text-xl font-bold text-[var(--color-text-primary)]">
        지금 집중할 것을 골라주세요
      </h2>
      <p className="mb-1 text-sm text-[var(--color-text-secondary)]">
        1~3개만 선택하세요. 나머지는 나중에 할 수 있어요
      </p>
      <p className="mb-5 text-xs font-medium text-[var(--color-text-tertiary)]">
        {activeGoalIds.length}/3 선택됨
      </p>

      {/* Goal cards with stagger */}
      <div className="mb-4 space-y-2">
        {organizedGoals.map((goal, i) => {
          const effectiveAreaType = goal.userOverriddenArea ?? goal.areaType
          const areaPreset = AREA_PRESETS_EXTENDED.find((a) => a.type === effectiveAreaType)
          const emoji = areaPreset?.emoji ?? '🎯'
          const color = areaPreset?.color ?? '#8a7a65'
          const isActive = activeGoalIds.includes(goal.id)
          const isDisabled = !isActive && activeGoalIds.length >= 3

          return (
            <motion.button
              key={goal.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggleActiveGoal(goal.id)}
              disabled={isDisabled}
              className={cn(
                'relative flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors',
                isActive
                  ? 'border-current'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]',
                isDisabled && 'cursor-not-allowed opacity-40',
                !isActive && !isDisabled && 'hover:border-[var(--color-border-hover)]'
              )}
              style={
                isActive ? { color, borderColor: color, backgroundColor: `${color}15` } : undefined
              }
            >
              <span className="text-xl">{emoji}</span>
              <span
                className={cn(
                  'flex-1 text-sm font-medium',
                  isActive
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)]'
                )}
              >
                {goal.name}
              </span>
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <Check className="h-5 w-5" style={{ color }} />
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Reassurance */}
      <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">
        선택하지 않은 목표도 사라지지 않아요. 나중에 활성화할 수 있어요 🌱
      </p>

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
