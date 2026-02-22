'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button, Card, Confetti } from '@/components/ui'
import { Mascot } from '@/components/common/mascot'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { useCompleteOnboarding } from '../hooks/use-complete-onboarding'

function CheckIcon({ delay }: { delay: number }) {
  return (
    <motion.svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      initial="hidden"
      animate="visible"
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="var(--color-done)"
        strokeWidth="2"
        fill="none"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: { pathLength: 1, opacity: 1 },
        }}
        transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      />
      <motion.path
        d="M8 12l3 3 5-5"
        stroke="var(--color-done)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: { pathLength: 1, opacity: 1 },
        }}
        transition={{ delay: delay + 0.3, duration: 0.3, ease: 'easeOut' }}
      />
    </motion.svg>
  )
}

export function CompletionScreen() {
  const { complete, isPending, error } = useCompleteOnboarding()
  const {
    isGuidedMode,
    generatedDirection,
    directionMode,
    editedDirection,
    selectedAreas,
    firstGoal,
    firstTask,
    organizedGoals,
    activeGoalIds,
    suggestedTasks,
    derivedAreas,
  } = useOnboardingStore()

  const [isCompleted, setIsCompleted] = useState(false)

  const directionText =
    directionMode === 'edit' && editedDirection
      ? editedDirection
      : directionMode === 'explore'
        ? null
        : generatedDirection

  const handleStart = async () => {
    await complete()
    setIsCompleted(true)
  }

  // Build summary items
  const summaryItems: Array<{ icon: string; label: string; value: string }> = []

  if (directionText) {
    summaryItems.push({
      icon: '🧭',
      label: '나의 방향',
      value: directionText.length > 40 ? directionText.slice(0, 40) + '...' : directionText,
    })
  } else if (directionMode === 'explore') {
    summaryItems.push({ icon: '🌱', label: '탐색 모드', value: '탐색하며 시작해요' })
  }

  if (isGuidedMode) {
    // V2 guided mode summary
    if (selectedAreas.length > 0) {
      summaryItems.push({
        icon: '📋',
        label: '나의 영역',
        value: selectedAreas.map((a) => `${a.emoji}${a.name}`).join(' '),
      })
    }

    if (firstGoal) {
      summaryItems.push({ icon: '🎯', label: '첫 목표', value: firstGoal.name })
    }

    if (firstTask) {
      summaryItems.push({ icon: '✅', label: '첫 실천', value: firstTask.name })
    }
  } else {
    // V3 brain-dump mode summary
    if (derivedAreas.length > 0) {
      summaryItems.push({
        icon: '📋',
        label: '나의 영역',
        value: derivedAreas.map((a) => `${a.emoji}${a.name}`).join(' '),
      })
    }

    const activeGoals = organizedGoals.filter((g) => activeGoalIds.includes(g.id)).slice(0, 3)
    if (activeGoals.length > 0) {
      summaryItems.push({
        icon: '🎯',
        label: '목표',
        value: activeGoals.map((g) => g.name).join(', '),
      })
    }

    const acceptedTasks = suggestedTasks.filter((t) => t.accepted).slice(0, 3)
    if (acceptedTasks.length > 0) {
      summaryItems.push({
        icon: '✅',
        label: '실천',
        value: acceptedTasks.map((t) => t.name).join(', '),
      })
    }
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-6 text-5xl">😢</div>
        <h2 className="mb-4 text-xl font-bold text-[var(--color-text-primary)]">
          문제가 발생했어요
        </h2>
        <p className="mb-6 text-[var(--color-text-secondary)]">{error}</p>
        <Button onClick={handleStart}>다시 시도</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Confetti trigger={isCompleted} />

      <motion.div
        className="mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Mascot mood="celebrating" size="xl" />
      </motion.div>

      <motion.h2
        className="mb-8 font-serif text-2xl font-bold text-[var(--color-text-primary)]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isGuidedMode ? '준비 완료!' : '벌써 이만큼 정리했어요!'}
      </motion.h2>

      {/* Summary card */}
      <motion.div
        className="mb-8 w-full max-w-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-5 text-left">
          <div className="space-y-4">
            {summaryItems.map((item, i) => (
              <motion.div
                key={item.label}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.15 }}
              >
                <CheckIcon delay={0.6 + i * 0.15} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--color-text-tertiary)]">
                    {item.icon} {item.label}
                  </p>
                  <p className="truncate text-sm text-[var(--color-text-primary)]">{item.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.p
        className="mb-8 text-sm text-[var(--color-text-secondary)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        당신의 로드맵이 시작되었어요
        <br />
        매일 작은 실천이 모여 큰 변화를 만들어요
      </motion.p>

      <motion.div
        className="w-full max-w-xs"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
      >
        <Button onClick={handleStart} disabled={isPending} size="lg" className="w-full gap-2">
          {isPending ? '설정 중...' : '🚀 시작하기'}
        </Button>
      </motion.div>
    </div>
  )
}
