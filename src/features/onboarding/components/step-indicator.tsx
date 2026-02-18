'use client'

import { motion } from 'framer-motion'
import { INDICATOR_STEPS, STEP_CONFIG_V2 } from '@/lib/constants/onboarding'
import { useOnboardingStore } from '@/stores/onboarding.store'

export function StepIndicator() {
  const currentStep = useOnboardingStore((s) => s.currentStep)
  // Don't show for welcome or completion
  if (currentStep === 'welcome' || currentStep === 'completion') return null

  const currentConfig = STEP_CONFIG_V2[currentStep as keyof typeof STEP_CONFIG_V2]
  const currentIndex = currentConfig?.index ?? 0

  return (
    <div className="mb-6 flex flex-col gap-3">
      {/* Segmented progress bar */}
      <div className="flex gap-1.5">
        {INDICATOR_STEPS.map((step, i) => (
          <div
            key={step}
            className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]"
          >
            <motion.div
              className="h-full rounded-full bg-[var(--color-primary-500)]"
              initial={false}
              animate={{
                width: i < currentIndex ? '100%' : i === currentIndex ? '50%' : '0%',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
        ))}
      </div>

      {/* Step labels */}
      <div className="flex">
        {INDICATOR_STEPS.map((step, i) => {
          const config = STEP_CONFIG_V2[step]
          const isActive = i === currentIndex
          const isCompleted = i < currentIndex
          return (
            <span
              key={step}
              className={`flex-1 text-center text-xs font-medium transition-colors ${
                isActive || isCompleted
                  ? 'text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-tertiary)]'
              }`}
            >
              {config.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
