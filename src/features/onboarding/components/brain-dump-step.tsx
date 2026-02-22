'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronLeft, X } from 'lucide-react'
import { Button, Chip, Input } from '@/components/ui'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { GOAL_CHIP_OPTIONS } from '@/lib/constants/onboarding'
import { useStepKeyboard } from '../hooks/use-step-keyboard'
import { cn } from '@/lib/utils'

export function BrainDumpStep() {
  const {
    selectedGoalChips,
    customGoals,
    toggleGoalChip,
    addCustomGoal,
    removeCustomGoal,
    organizeGoals,
    nextStep,
    prevStep,
    switchToGuidedMode,
  } = useOnboardingStore()

  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customInput, setCustomInput] = useState('')

  const totalCount = selectedGoalChips.length + customGoals.length
  const canProceed = totalCount >= 3

  const commitCustomGoal = () => {
    const trimmed = customInput.trim()
    if (trimmed) {
      addCustomGoal(trimmed)
      setCustomInput('')
      setShowCustomInput(false)
    }
  }

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitCustomGoal()
    } else if (e.key === 'Escape') {
      setCustomInput('')
      setShowCustomInput(false)
    }
  }

  const handleNext = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'brain-dump' })
    organizeGoals()
    nextStep()
  }

  useStepKeyboard({ onNext: canProceed ? handleNext : undefined, onBack: prevStep, canProceed })

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-1 text-xl font-bold text-[var(--color-text-primary)]">
        하고 싶은 것들, 다 골라보세요!
      </h2>
      <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
        탭하면 끝! 3개 이상 선택해주세요
      </p>

      {/* Chip grid */}
      <div className="flex flex-wrap gap-2">
        {GOAL_CHIP_OPTIONS.map((option, i) => (
          <motion.span
            key={option.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
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

        {/* Direct input chip */}
        {!showCustomInput ? (
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: GOAL_CHIP_OPTIONS.length * 0.04 }}
            whileTap={{ scale: 0.95 }}
          >
            <Chip
              variant="selection"
              selected={false}
              onClick={() => setShowCustomInput(true)}
              className="border-dashed"
            >
              <Plus className="h-4 w-4" />
              직접 입력
            </Chip>
          </motion.span>
        ) : (
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            onBlur={commitCustomGoal}
            placeholder="직접 입력..."
            className={cn(
              'h-10 w-40 rounded-full',
              customInput.trim()
                ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                : ''
            )}
            autoFocus
          />
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
            ✨ {totalCount}개 선택했어요!
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
        <Button
          variant="ghost"
          size="sm"
          onClick={switchToGuidedMode}
          className="w-full text-[var(--color-text-tertiary)]"
        >
          잘 모르겠어요
        </Button>
      </div>
    </div>
  )
}
