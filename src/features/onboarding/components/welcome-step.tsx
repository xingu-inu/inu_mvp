'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useOnboardingStore } from '@/stores/onboarding.store'

export function WelcomeStep() {
  const { nextStep, markStarted } = useOnboardingStore()

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_VIEWED, { step: 'welcome' })
  }, [])

  const handleStart = () => {
    markStarted()
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STARTED)
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_NEXT, { step: 'welcome' })
    nextStep()
  }

  return (
    <div className="flex flex-1 flex-col justify-center">
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <p className="mb-3 text-sm font-medium text-[var(--color-primary-600)]">빠른 시작</p>
        <h1 className="mb-3 text-3xl font-bold text-[var(--color-text-primary)]">
          내일 바로 시작할
          <br />
          1가지를 정해볼까요?
        </h1>
        <p className="text-base text-[var(--color-text-secondary)]">1분 안에 끝나요.</p>
      </motion.div>

      <motion.div
        className="mt-auto"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <Button onClick={handleStart} size="lg" className="h-12 w-full">
          빠르게 시작
        </Button>
      </motion.div>
    </div>
  )
}
