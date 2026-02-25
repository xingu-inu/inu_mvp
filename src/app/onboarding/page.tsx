'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useOnboardingStore } from '@/stores/onboarding.store'
import {
  StepIndicator,
  WelcomeStep,
  AnimatedStep,
  BrainDumpStep,
  LifeOrganizedStep,
} from '@/features/onboarding'

export default function OnboardingPage() {
  const { currentStep, direction, isNavigating } = useOnboardingStore()

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
          로드맵으로 이동 중...
        </motion.p>
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary-500)]" />
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
        {currentStep === 'brain-dump' && (
          <AnimatedStep key="brain-dump" stepKey="brain-dump" direction={direction}>
            <BrainDumpStep />
          </AnimatedStep>
        )}
        {currentStep === 'life-organized' && (
          <AnimatedStep key="life-organized" stepKey="life-organized" direction={direction}>
            <LifeOrganizedStep />
          </AnimatedStep>
        )}
      </AnimatePresence>
    </div>
  )
}
