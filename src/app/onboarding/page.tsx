'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useOnboardingStore } from '@/stores/onboarding.store'
import {
  StepIndicator,
  WelcomeStep,
  StepIndicatorV3,
  WelcomeStepV3,
  AnimatedStep,
  GoalCaptureStep,
  FirstActionStep,
  BrainDumpStepV3,
  LifeOrganizedStepV3,
} from '@/features/onboarding'
import { useOnboardingV4Flag } from '@/features/onboarding'

export default function OnboardingPage() {
  const isOnboardingV4Enabled = useOnboardingV4Flag()
  const { currentStep, direction, isNavigating, setFlowVersion } = useOnboardingStore()

  useEffect(() => {
    setFlowVersion(isOnboardingV4Enabled ? 'v4' : 'v3')
  }, [isOnboardingV4Enabled, setFlowVersion])

  if (isNavigating) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center text-center">
        <motion.div
          className="mb-4 text-5xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          🚀
        </motion.div>
        <motion.p
          className="mb-6 text-lg font-medium text-[var(--color-text-primary)]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          홈으로 이동 중...
        </motion.p>
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary-500)]" />
      </div>
    )
  }

  if (!isOnboardingV4Enabled) {
    return (
      <div className="flex min-h-full flex-col overflow-hidden">
        <StepIndicatorV3 />
        <AnimatePresence mode="wait" custom={direction}>
          {currentStep === 'welcome' && (
            <AnimatedStep key="welcome-v3" stepKey="welcome-v3" direction={direction}>
              <WelcomeStepV3 />
            </AnimatedStep>
          )}
          {currentStep === 'brain-dump' && (
            <AnimatedStep key="brain-dump-v3" stepKey="brain-dump-v3" direction={direction}>
              <BrainDumpStepV3 />
            </AnimatedStep>
          )}
          {currentStep === 'life-organized' && (
            <AnimatedStep key="life-organized-v3" stepKey="life-organized-v3" direction={direction}>
              <LifeOrganizedStepV3 />
            </AnimatedStep>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col overflow-hidden">
      {/* Step Indicator (hidden on welcome) */}
      <StepIndicator />

      {/* Step Content with Animation */}
      <AnimatePresence mode="wait" custom={direction}>
        {currentStep === 'welcome' && (
          <AnimatedStep key="welcome" stepKey="welcome" direction={direction}>
            <WelcomeStep />
          </AnimatedStep>
        )}
        {currentStep === 'goal-capture' && (
          <AnimatedStep key="goal-capture" stepKey="goal-capture" direction={direction}>
            <GoalCaptureStep />
          </AnimatedStep>
        )}
        {currentStep === 'first-action' && (
          <AnimatedStep key="first-action" stepKey="first-action" direction={direction}>
            <FirstActionStep />
          </AnimatedStep>
        )}
      </AnimatePresence>
    </div>
  )
}
