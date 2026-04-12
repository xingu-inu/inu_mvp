'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { useProfile } from '@/queries'
import { queryKeys } from '@/lib/query/keys'
import { WHY_CHIPS, composeDirectionStatement, getFeelingArea } from '@/lib/constants/onboarding'
import { completeOnboarding } from '@/actions/onboarding.actions'
import { useAiChatStore } from '@/stores/ai-chat.store'
import { OnboardingStepFeeling } from './onboarding-step-feeling'
import { OnboardingStepWhy } from './onboarding-step-why'
import { OnboardingStepConfirm } from './onboarding-step-confirm'

type Step = 1 | 2 | 3

const STEP_TITLES: Record<Step, string> = {
  1: '방향 찾기',
  2: '방향 찾기',
  3: '나의 방향',
}

export function OnboardingModal() {
  const { data: profile } = useProfile()
  const queryClient = useQueryClient()
  const openChat = useAiChatStore((s) => s.openChat)
  const mountedRef = useRef(true)

  const [step, setStep] = useState<Step>(1)
  const [feelingId, setFeelingId] = useState<string | null>(null)
  const [whyId, setWhyId] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    return sessionStorage.getItem('onboarding-dismissed') === 'true'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Show modal: onboarding not completed AND not dismissed this session
  const shouldShow = profile?.onboarding_completed === false && !dismissed

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem('onboarding-dismissed', 'true')
    setDismissed(true)
  }, [])

  const handleFeelingSelect = useCallback((id: string) => {
    setFeelingId(id)
    setStep(2)
  }, [])

  const handleWhySelect = useCallback((id: string) => {
    setWhyId(id)
    setStep(3)
  }, [])

  const handleConfirm = useCallback(
    async (editedStatement: string) => {
      if (!feelingId || !whyId || isSubmitting) return
      setIsSubmitting(true)

      try {
        const whyChip = WHY_CHIPS.find((c) => c.id === whyId)
        const whyText = whyChip?.why ?? ''
        const area = getFeelingArea(feelingId)

        // 단일 트랜잭셔널 서버 액션: Direction + Area + onboarding_completed
        await completeOnboarding({
          direction: { statement: editedStatement, why: whyText },
          area: {
            name: area.name,
            type: area.type,
            emoji: area.emoji,
            color: area.color,
            why: whyText,
          },
        })

        // 캐시 무효화
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.profile.me }),
          queryClient.invalidateQueries({ queryKey: queryKeys.direction.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.areas.all }),
        ])

        if (mountedRef.current) {
          setDismissed(true)
          openChat()
        }
      } catch {
        if (mountedRef.current) {
          toast.error('설정에 실패했습니다. 다시 시도해주세요.')
        }
      } finally {
        if (mountedRef.current) setIsSubmitting(false)
      }
    },
    [feelingId, whyId, isSubmitting, queryClient, openChat]
  )

  // Step 3 → step 2 (feeling 유지), step 2 → step 1
  const handleBack = useCallback(() => {
    if (step === 3) {
      setWhyId(null)
      setStep(2)
    } else {
      setFeelingId(null)
      setStep(1)
    }
  }, [step])

  if (!shouldShow) return null

  const statement = feelingId && whyId ? composeDirectionStatement(feelingId, whyId) : ''

  return (
    <ResponsiveModal
      open={true}
      onOpenChange={(open) => {
        if (!open) handleDismiss()
      }}
      title={STEP_TITLES[step]}
      description="일상에서 나의 방향을 찾아보세요"
    >
      {/* Progress dots */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${
              s === step
                ? 'w-8 bg-[var(--color-primary)]'
                : s < step
                  ? 'w-2 bg-[var(--color-primary-300)]'
                  : 'w-2 bg-[var(--color-border)]'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {step === 1 && <OnboardingStepFeeling onNext={handleFeelingSelect} />}
          {step === 2 && <OnboardingStepWhy onNext={handleWhySelect} onBack={handleBack} />}
          {step === 3 && feelingId && whyId && (
            <OnboardingStepConfirm
              statement={statement}
              whyId={whyId}
              onConfirm={handleConfirm}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Skip button */}
      {step < 3 && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
          >
            건너뛰기
          </button>
        </div>
      )}
    </ResponsiveModal>
  )
}
