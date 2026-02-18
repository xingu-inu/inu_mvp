'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'

export function WelcomeStep() {
  const { nextStep } = useOnboardingStore()

  const features = [
    { emoji: '🧭', text: '방향을 찾고' },
    { emoji: '✅', text: '매일 작은 실천을 쌓고' },
    { emoji: '📊', text: '성장을 기록해요' },
  ]

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      {/* Background gradient */}
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[var(--color-primary-50)] via-transparent to-[var(--color-ai-bg)] opacity-50"
        aria-hidden="true"
      />

      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <motion.div
          className="mb-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <Image src="/logo.svg" alt="inu" width={80} height={80} />
        </motion.div>

        <motion.p
          className="mb-10 text-lg text-[var(--color-text-secondary)]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          나의 인생 로드맵을
          <br />
          함께 그려볼까요?
        </motion.p>

        {/* Feature list with stagger */}
        <div className="mb-10 space-y-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.text}
              className="flex items-center gap-3 text-[var(--color-text-secondary)]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.15 }}
            >
              <span className="text-xl">{feature.emoji}</span>
              <span className="text-base">{feature.text}</span>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="mb-8 text-sm text-[var(--color-text-tertiary)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          약 1분이면 시작할 수 있어요
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="w-full max-w-xs"
        >
          <Button onClick={() => { trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'welcome' }); nextStep() }} size="lg" className="w-full">
            시작하기
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
