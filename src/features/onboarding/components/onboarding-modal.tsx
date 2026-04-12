'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { useProfile } from '@/queries'
import { queryKeys } from '@/lib/query/keys'
import { IDENTITY_CHIP_GROUPS } from '@/lib/constants/onboarding'
import { completeOnboarding } from '@/actions/onboarding.actions'
import { unwrapResponse } from '@/lib/api/unwrap'
import { useAiChatStore } from '@/stores/ai-chat.store'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { OnboardingStepIdentity } from './onboarding-step-identity'
import { OnboardingStepValues } from './onboarding-step-values'
import { OnboardingStepInterests } from './onboarding-step-interests'

type Step = 1 | 2 | 3

const STEP_TITLES: Record<Step, string> = {
  1: '나를 알아가기',
  2: '나의 방향',
  3: '관심 영역',
}

export function OnboardingModal() {
  const { data: profile } = useProfile()
  const queryClient = useQueryClient()
  const openChat = useAiChatStore((s) => s.openChat)
  const openInuFullscreen = useAiChatStore((s) => s.openInuFullscreen)
  const setRightPanelTab = useRoadmapStore((s) => s.setRightPanelTab)
  const isMobile = useIsMobile()
  const mountedRef = useRef(true)

  const [step, setStep] = useState<Step>(1)
  const [identityIds, setIdentityIds] = useState<string[]>([])
  const [customIdentities, setCustomIdentities] = useState<string[]>([])
  const [valueIds, setValueIds] = useState<string[]>([])
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

  const shouldShow = profile?.onboarding_completed === false && !dismissed

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem('onboarding-dismissed', 'true')
    setDismissed(true)
  }, [])

  // Step 1 → 2
  const handleIdentityNext = useCallback((selectedIds: string[], customInputs: string[]) => {
    setIdentityIds(selectedIds)
    setCustomIdentities(customInputs)
    setStep(2)
  }, [])

  // Step 2 → 3
  const handleValuesNext = useCallback((selectedIds: string[]) => {
    setValueIds(selectedIds)
    setStep(3)
  }, [])

  // Step 3 → 제출
  const handleInterestsNext = useCallback(
    async (selectedInterestIds: string[]) => {
      if (isSubmitting) return
      setIsSubmitting(true)

      try {
        // identity 칩 ID → { label: groupLabel, value: chipLabel } 변환
        const identityTraits: { label: string; value: string }[] = []

        for (const chipId of identityIds) {
          for (const group of IDENTITY_CHIP_GROUPS) {
            const chip = group.chips.find((c) => c.id === chipId)
            if (chip) {
              identityTraits.push({ label: group.groupLabel, value: chip.label })
              break
            }
          }
        }

        // 커스텀 입력 추가
        for (const custom of customIdentities) {
          identityTraits.push({ label: '기타', value: custom })
        }

        unwrapResponse(
          await completeOnboarding({
            identityTraits,
            values: valueIds,
            interests: selectedInterestIds,
          })
        )

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.profile.me }),
          queryClient.invalidateQueries({ queryKey: queryKeys.direction.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.areas.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.profileTraits.all }),
        ])

        if (mountedRef.current) {
          setDismissed(true)
          if (isMobile) {
            openInuFullscreen()
          } else {
            setRightPanelTab('inu')
            openChat()
          }
        }
      } catch {
        if (mountedRef.current) {
          toast.error('설정에 실패했습니다. 다시 시도해주세요.')
        }
      } finally {
        if (mountedRef.current) setIsSubmitting(false)
      }
    },
    [
      identityIds,
      customIdentities,
      valueIds,
      isSubmitting,
      queryClient,
      openChat,
      openInuFullscreen,
      setRightPanelTab,
      isMobile,
    ]
  )

  const handleBack = useCallback(() => {
    if (step === 3) {
      setStep(2)
    } else if (step === 2) {
      setStep(1)
    }
  }, [step])

  if (!shouldShow) return null

  return (
    <ResponsiveModal
      open={true}
      onOpenChange={(open) => {
        if (!open) handleDismiss()
      }}
      title={STEP_TITLES[step]}
      description="나에 대해 알아가는 시간이에요"
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
          {step === 1 && (
            <OnboardingStepIdentity
              onNext={handleIdentityNext}
              initialSelected={identityIds}
              initialCustom={customIdentities}
            />
          )}
          {step === 2 && (
            <OnboardingStepValues
              onNext={handleValuesNext}
              onBack={handleBack}
              initialSelected={valueIds}
            />
          )}
          {step === 3 && (
            <OnboardingStepInterests
              onNext={handleInterestsNext}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Skip button — available on all steps */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
        >
          건너뛰기
        </button>
      </div>
    </ResponsiveModal>
  )
}
