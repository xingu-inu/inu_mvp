'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Card, Textarea } from '@/components/ui'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useStepKeyboard } from '../hooks/use-step-keyboard'
import { Check, Pencil, Search, ChevronLeft, Sparkles } from 'lucide-react'

function ShimmerSkeleton() {
  return (
    <div className="space-y-3 p-6">
      <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-ai)]">
        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
        <span>AI가 분석하고 있어요...</span>
      </div>
      {[80, 65, 50].map((width, i) => (
        <motion.div
          key={i}
          className="h-4 rounded-full bg-[var(--color-bg-tertiary)]"
          style={{ width: `${width}%` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  )
}

function TypedDirection({ text }: { text: string }) {
  const words = text.split(' ')
  return (
    <p className="text-center font-serif text-lg leading-relaxed font-medium text-[var(--color-text-primary)]">
      &ldquo;
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
      &rdquo;
    </p>
  )
}

export function DirectionStep() {
  const {
    isGuidedMode,
    organizedGoals,
    activeGoalIds,
    generatedDirection,
    directionMode,
    editedDirection,
    setDirectionMode,
    setEditedDirection,
    setGeneratedDirection,
    nextStep,
    prevStep,
  } = useOnboardingStore()

  const [localEdit, setLocalEdit] = useState(editedDirection || generatedDirection || '')
  const alreadyVisited = directionMode === 'edit' || directionMode === 'explore'
  const [isLoading, setIsLoading] = useState(!alreadyVisited)
  const [showDirection, setShowDirection] = useState(alreadyVisited)

  // V3: synthesize direction from active goals via AI
  useEffect(() => {
    if (isGuidedMode || generatedDirection) return

    const activeGoals = organizedGoals.filter((g) => activeGoalIds.includes(g.id))
    const goalNames = activeGoals.map((g) => g.name)

    fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'why-vision',
        target: 'direction-why',
        context: { existingGoals: goalNames },
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data?.suggestions?.[0]?.text) {
          setGeneratedDirection(result.data.suggestions[0].text)
        } else {
          setGeneratedDirection(`${goalNames.slice(0, 3).join(', ')}을 향해 나아가는 삶`)
        }
      })
      .catch(() => {
        setGeneratedDirection(`${goalNames.slice(0, 3).join(', ')}을 향해 나아가는 삶`)
      })
  }, [isGuidedMode, generatedDirection, organizedGoals, activeGoalIds, setGeneratedDirection])

  // Shimmer → reveal sequence (wait for AI + minimum 800ms)
  useEffect(() => {
    if (!isLoading) return
    if (!generatedDirection) return
    const timer = setTimeout(() => {
      setIsLoading(false)
      setShowDirection(true)
    }, 800)
    return () => clearTimeout(timer)
  }, [isLoading, generatedDirection])

  const handleAccept = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'direction' })
    setDirectionMode('accept')
    nextStep()
  }

  const handleEdit = () => {
    setDirectionMode('edit')
  }

  const handleExplore = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'direction' })
    setDirectionMode('explore')
    nextStep()
  }

  const handleSaveEdit = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'direction' })
    setEditedDirection(localEdit)
    nextStep()
  }

  useStepKeyboard({ onBack: prevStep, canProceed: false })

  // Explore confirmation view
  if (directionMode === 'explore') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Card className="max-w-sm p-8">
          <div className="mb-6 text-5xl">🌱</div>
          <h2 className="mb-4 text-xl font-bold text-[var(--color-text-primary)]">괜찮아요!</h2>
          <p className="mb-6 text-[var(--color-text-secondary)]">
            인생의 방향은 살면서 찾아가는 거예요.
            <br />
            <br />
            지금은 방향 없이 시작하고, 실천하면서 발견해도 돼요.
          </p>
          <p className="mb-8 text-sm text-[var(--color-ai)]">
            inu가 당신의 패턴을 보면서 나중에 제안해드릴게요.
          </p>
          <Button
            onClick={() => {
              trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'direction' })
              nextStep()
            }}
            className="w-full"
          >
            탐색하며 시작하기
          </Button>
        </Card>
      </div>
    )
  }

  // Edit mode view
  if (directionMode === 'edit') {
    return (
      <div className="flex flex-1 flex-col">
        <h2 className="mb-2 text-xl font-bold text-[var(--color-text-primary)]">
          나의 방향을 수정해주세요
        </h2>
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
          언제든 설정에서 바꿀 수 있어요.
        </p>

        <Textarea
          value={localEdit}
          onChange={(e) => setLocalEdit(e.target.value)}
          placeholder="나의 인생 방향..."
          className="mb-4 min-h-[120px]"
        />

        <p className="mb-6 text-sm text-[var(--color-text-tertiary)]">{localEdit.length}/500</p>

        <div className="mt-auto flex gap-3 pt-6">
          <Button variant="secondary" onClick={() => setDirectionMode(null)} className="flex-1">
            취소
          </Button>
          <Button onClick={handleSaveEdit} disabled={localEdit.length < 10} className="flex-1">
            저장하고 다음
          </Button>
        </div>
      </div>
    )
  }

  // Default view - direction confirmation with shimmer → typing reveal
  return (
    <div className="flex flex-1 flex-col">
      <motion.h2
        className="mb-2 text-xl font-bold text-[var(--color-text-primary)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {isLoading ? '✨ 당신의 방향을 만들고 있어요...' : '✨ 이런 방향은 어떨까요?'}
      </motion.h2>
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
        {isGuidedMode
          ? '선택한 가치를 바탕으로 만들어봤어요'
          : '당신의 목표들을 바탕으로 만들어봤어요'}
      </p>

      {/* Direction Card */}
      <Card variant="hero" className="relative mb-6 overflow-hidden p-6">
        <div
          className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-50)] via-transparent to-[var(--color-ai-bg)] opacity-50"
          aria-hidden="true"
        />

        <div className="relative">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="shimmer" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <ShimmerSkeleton />
              </motion.div>
            ) : (
              <motion.div key="direction" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {generatedDirection && <TypedDirection text={generatedDirection} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      <AnimatePresence>
        {showDirection && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="mb-8 text-center text-sm text-[var(--color-text-tertiary)]">
              마음에 들면 그대로 시작하고,
              <br />
              아니면 자유롭게 수정하세요.
              <br />
              언제든 바꿀 수 있어요.
            </p>

            <div className="space-y-3">
              <Button onClick={handleAccept} className="w-full gap-2">
                <Check className="h-4 w-4" />
                이대로 시작할게요
              </Button>
              <Button variant="secondary" onClick={handleEdit} className="w-full gap-2">
                <Pencil className="h-4 w-4" />
                수정할게요
              </Button>
              <Button variant="ghost" onClick={handleExplore} className="w-full gap-2">
                <Search className="h-4 w-4" />
                아직 모르겠어요
              </Button>
            </div>

            <Button variant="ghost" size="sm" onClick={prevStep} className="mt-2 w-full gap-1">
              <ChevronLeft className="h-4 w-4" />
              이전으로
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
