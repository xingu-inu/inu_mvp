'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useOnboardingStore } from '@/stores/onboarding.store'
import {
  StepIndicator,
  WelcomeStep,
  ValuesStep,
  DirectionStep,
  AreasStep,
  FirstGoalStep,
  CompletionScreen,
  AnimatedStep,
  BrainDumpStep,
  OrganizeStep,
  PrioritizeStep,
  ActionsStep,
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
      {/* Step Indicator (hidden on welcome + completion) */}
      <StepIndicator />

      {/* Step Content with Animation */}
      <AnimatePresence mode="wait" custom={direction}>
        {currentStep === 'welcome' && (
          <AnimatedStep key="welcome" stepKey="welcome" direction={direction}>
            <WelcomeStep />
          </AnimatedStep>
        )}
        {currentStep === 'values' && (
          <AnimatedStep key="values" stepKey="values" direction={direction}>
            <ValuesStep />
          </AnimatedStep>
        )}
        {currentStep === 'direction' && (
          <AnimatedStep key="direction" stepKey="direction" direction={direction}>
            <DirectionStep />
          </AnimatedStep>
        )}
        {currentStep === 'areas' && (
          <AnimatedStep key="areas" stepKey="areas" direction={direction}>
            <AreasStep />
          </AnimatedStep>
        )}
        {currentStep === 'first-goal' && (
          <AnimatedStep key="first-goal" stepKey="first-goal" direction={direction}>
            <FirstGoalStep />
          </AnimatedStep>
        )}
        {currentStep === 'brain-dump' && (
          <AnimatedStep key="brain-dump" stepKey="brain-dump" direction={direction}>
            <BrainDumpStep />
          </AnimatedStep>
        )}
        {currentStep === 'organize' && (
          <AnimatedStep key="organize" stepKey="organize" direction={direction}>
            <OrganizeStep />
          </AnimatedStep>
        )}
        {currentStep === 'prioritize' && (
          <AnimatedStep key="prioritize" stepKey="prioritize" direction={direction}>
            <PrioritizeStep />
          </AnimatedStep>
        )}
        {currentStep === 'actions' && (
          <AnimatedStep key="actions" stepKey="actions" direction={direction}>
            <ActionsStep />
          </AnimatedStep>
        )}
        {currentStep === 'completion' && (
          <AnimatedStep key="completion" stepKey="completion" direction={direction}>
            <CompletionScreen />
          </AnimatedStep>
        )}
      </AnimatePresence>
    </div>
  )
}
