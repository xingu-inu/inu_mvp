'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { AREA_PRESETS_EXTENDED } from '@/lib/constants/onboarding'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useStepKeyboard } from '../hooks/use-step-keyboard'
import type { AreaType } from '@/types/entities'
import type { OrganizedGoal } from '@/stores/onboarding.store'

interface AreaGroup {
  areaType: AreaType
  name: string
  emoji: string
  color: string
  goals: OrganizedGoal[]
}

export function OrganizeStep() {
  const { organizedGoals, overrideGoalArea, nextStep, prevStep } = useOnboardingStore()

  // Group goals by effective area
  const areaGroups = useMemo(() => {
    const groupMap = new Map<string, OrganizedGoal[]>()

    for (const goal of organizedGoals) {
      const effectiveArea = goal.userOverriddenArea ?? goal.areaType
      const existing = groupMap.get(effectiveArea) ?? []
      existing.push(goal)
      groupMap.set(effectiveArea, existing)
    }

    const groups: AreaGroup[] = []
    for (const [areaType, goals] of groupMap) {
      const preset = AREA_PRESETS_EXTENDED.find((a) => a.type === areaType)
      groups.push({
        areaType: areaType as AreaType,
        name: preset?.name ?? '미분류',
        emoji: preset?.emoji ?? '📌',
        color: preset?.color ?? '#8a7a65',
        goals,
      })
    }

    return groups
  }, [organizedGoals])

  const handleNext = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'organize' })
    nextStep()
  }

  useStepKeyboard({ onNext: handleNext, onBack: prevStep, canProceed: true })

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-1 text-xl font-bold text-[var(--color-text-primary)]">
        우와, 이렇게 정리되었어요!
      </h2>
      <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
        목표들이 영역별로 나뉘었어요
      </p>

      {/* Area group cards */}
      <div className="mb-4 space-y-3">
        {areaGroups.map((group, groupIdx) => (
          <motion.div
            key={group.areaType}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIdx * 0.1 }}
          >
            <Card className="overflow-hidden p-0">
              {/* Area header */}
              <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <span className="text-base">{group.emoji}</span>
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {group.name}
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {group.goals.length}개
                </span>
              </div>

              {/* Goals in this area */}
              <div className="divide-y divide-[var(--color-border)]">
                {group.goals.map((goal) => {
                  const effectiveArea = goal.userOverriddenArea ?? goal.areaType
                  return (
                    <div key={goal.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-primary)]">
                        {goal.name}
                      </span>
                      <select
                        value={effectiveArea}
                        onChange={(e) => overrideGoalArea(goal.id, e.target.value as AreaType)}
                        className={cn(
                          'rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]',
                          'px-2 py-1 text-xs text-[var(--color-text-secondary)]',
                          'focus:border-[var(--color-primary-500)] focus:outline-none'
                        )}
                      >
                        {AREA_PRESETS_EXTENDED.map((area) => (
                          <option key={area.type} value={area.type}>
                            {area.emoji} {area.name}
                          </option>
                        ))}
                        <option value="custom">📌 미분류</option>
                      </select>
                    </div>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">
        영역이 맞지 않으면 드롭다운으로 변경할 수 있어요
      </p>

      {/* Navigation */}
      <div className="mt-auto space-y-2 pt-6">
        <Button onClick={handleNext} className="w-full">
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
