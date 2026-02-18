'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { AREA_PRESETS_EXTENDED } from '@/lib/constants/onboarding'
import { useStepKeyboard } from '../hooks/use-step-keyboard'
import { AreaSelectCard } from './area-select-card'
import { ChevronLeft } from 'lucide-react'

export function AreasStep() {
  const { selectedAreas, toggleArea, computePreSelectedAreas, nextStep, prevStep } =
    useOnboardingStore()

  const hasComputedRef = useRef(false)

  // Smart pre-selection on mount
  useEffect(() => {
    if (!hasComputedRef.current) {
      hasComputedRef.current = true
      computePreSelectedAreas()
    }
  }, [computePreSelectedAreas])

  const canProceed = selectedAreas.length > 0

  const handleNext = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'areas' })
    nextStep()
  }

  useStepKeyboard({ onNext: canProceed ? handleNext : undefined, onBack: prevStep, canProceed })

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-2 text-xl font-bold text-[var(--color-text-primary)]">
        관심 있는 영역을 골라주세요
      </h2>
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
        나중에 언제든 변경할 수 있어요
      </p>

      {/* 2-column grid */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {AREA_PRESETS_EXTENDED.map((area, i) => (
          <AreaSelectCard
            key={area.type}
            area={area}
            selected={selectedAreas.some((a) => a.type === area.type)}
            onToggle={() => toggleArea(area)}
            index={i}
          />
        ))}
      </div>

      {selectedAreas.length > 0 && (
        <p className="mb-4 text-sm text-[var(--color-text-tertiary)]">
          {selectedAreas.length}개 영역 선택됨
        </p>
      )}

      {/* Navigation */}
      <div className="mt-auto space-y-2 pt-6">
        <Button onClick={handleNext} disabled={!canProceed} className="w-full">
          다음
        </Button>
        <Button variant="ghost" size="sm" onClick={prevStep} className="w-full gap-1">
          <ChevronLeft className="h-4 w-4" />
          이전으로
        </Button>
      </div>
    </div>
  )
}
