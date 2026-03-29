'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useOnboardingStore } from '@/stores/onboarding.store'
import {
  StepIndicatorV5,
  AnimatedStep,
  BrainDumpStepV5,
  ReviewStepV5,
  DirectionStepV5,
} from '@/features/onboarding'

export default function OnboardingPage() {
  const { currentStep, direction, isNavigating, setFlowVersion, nextStep } = useOnboardingStore()

  useEffect(() => {
    setFlowVersion('v5')
  }, [setFlowVersion])

  // v5에서 welcome step은 사용하지 않으므로 즉시 건너뜀
  useEffect(() => {
    if (currentStep === 'welcome') {
      nextStep()
    }
  }, [currentStep, nextStep])

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

  return (
    <div className="flex min-h-full flex-col overflow-hidden">
      <StepIndicatorV5 />
      <AnimatePresence mode="wait" custom={direction}>
        {currentStep === 'brain-dump-v5' && (
          <AnimatedStep key="brain-dump-v5" stepKey="brain-dump-v5" direction={direction}>
            <BrainDumpStepV5 />
          </AnimatedStep>
        )}
        {currentStep === 'review-v5' && (
          <AnimatedStep key="review-v5" stepKey="review-v5" direction={direction}>
            <ReviewStepV5 />
          </AnimatedStep>
        )}
        {currentStep === 'direction-v5' && (
          <AnimatedStep key="direction-v5" stepKey="direction-v5" direction={direction}>
            <DirectionStepV5 />
          </AnimatedStep>
        )}
      </AnimatePresence>
    </div>
  )
}
