'use client'

import { useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronLeft, Circle } from 'lucide-react'

import { Button, Card } from '@/components/ui'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import {
  AREA_PRESETS_EXTENDED,
  SAMPLE_TASKS,
  type DefaultAreaOption,
} from '@/lib/constants/onboarding'
import { cn } from '@/lib/utils'
import { buildSuggestedTaskKey, useOnboardingStore } from '@/stores/onboarding.store'
import { useStepKeyboard } from '../hooks/use-step-keyboard'
import { useCompleteOnboarding } from '../hooks/use-complete-onboarding'
import type { AreaType } from '@/types/entities'

function uniqueTaskNames(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of values) {
    const value = raw.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }

  return result
}

function getAreaPreset(areaType: AreaType): DefaultAreaOption {
  return (
    AREA_PRESETS_EXTENDED.find((area) => area.type === areaType) ?? {
      name: '기타',
      type: 'custom',
      emoji: '??',
      color: '#8a7a65',
    }
  )
}

export function FirstActionStep() {
  const {
    organizedGoals,
    activeGoalIds,
    suggestedTasks,
    aiPreparedTaskSeeds,
    primaryTaskId,
    aiEnhanceStatus,
    setSuggestedTasks,
    setPrimaryTask,
    setAiEnhanceStatus,
    toggleTaskAccepted,
    prevStep,
  } = useOnboardingStore()
  const { complete, isPending, error } = useCompleteOnboarding()

  const aiRequestRef = useRef<string>('')

  const activeGoals = useMemo(
    () => organizedGoals.filter((goal) => activeGoalIds.includes(goal.id)),
    [organizedGoals, activeGoalIds]
  )

  const localFallbackTaskMap = useMemo(() => {
    const map = new Map<string, string[]>()

    for (const goal of activeGoals) {
      const areaType = (goal.userOverriddenArea ?? goal.areaType) as AreaType
      const templates = SAMPLE_TASKS[areaType]
      const fallbackNames =
        templates.length > 0
          ? templates.slice(0, 2)
          : [`${goal.name} 10분 시작`, `${goal.name} 진행 기록`]
      map.set(goal.id, fallbackNames)
    }

    return map
  }, [activeGoals])

  const aiSeedTaskMap = useMemo(() => {
    const goalIdByName = new Map<string, string>()
    for (const goal of activeGoals) {
      goalIdByName.set(goal.name.trim().toLowerCase(), goal.id)
    }

    const map = new Map<string, string[]>()

    for (const seed of aiPreparedTaskSeeds) {
      const goalId = goalIdByName.get(seed.goalName.trim().toLowerCase())
      if (!goalId) continue

      const current = map.get(goalId) ?? []
      current.push(seed.taskName)
      map.set(goalId, current)
    }

    for (const [goalId, taskNames] of map.entries()) {
      map.set(goalId, uniqueTaskNames(taskNames).slice(0, 2))
    }

    return map
  }, [activeGoals, aiPreparedTaskSeeds])

  const hasAiSeededTasks = aiSeedTaskMap.size > 0

  const canProceed = useMemo(() => {
    if (activeGoalIds.length < 1 || !primaryTaskId) return false

    return suggestedTasks.some(
      (task) => task.accepted && buildSuggestedTaskKey(task.goalId, task.name) === primaryTaskId
    )
  }, [activeGoalIds.length, primaryTaskId, suggestedTasks])

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_VIEWED, { step: 'first-action' })
  }, [])

  useEffect(() => {
    if (activeGoals.length === 0) return
    if (suggestedTasks.length > 0) return

    const seededTasks = activeGoals.flatMap((goal) =>
      (aiSeedTaskMap.get(goal.id) ?? []).map((name) => ({
        goalId: goal.id,
        name,
        accepted: true,
      }))
    )

    if (seededTasks.length > 0) {
      setSuggestedTasks(seededTasks)
      setAiEnhanceStatus('done')
      return
    }

    const localTasks = activeGoals.flatMap((goal) =>
      (localFallbackTaskMap.get(goal.id) ?? []).map((name) => ({
        goalId: goal.id,
        name,
        accepted: true,
      }))
    )

    if (localTasks.length > 0) {
      setSuggestedTasks(localTasks)
    }
  }, [
    activeGoals,
    aiSeedTaskMap,
    localFallbackTaskMap,
    setAiEnhanceStatus,
    setSuggestedTasks,
    suggestedTasks.length,
  ])

  useEffect(() => {
    if (activeGoals.length === 0) return
    if (hasAiSeededTasks) return

    const requestKey = activeGoals.map((goal) => goal.id).join(',')
    if (aiRequestRef.current === requestKey) return
    aiRequestRef.current = requestKey

    setAiEnhanceStatus('loading')
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_AI_ENHANCE_REQUESTED, {
      goal_count: activeGoals.length,
    })

    void (async () => {
      try {
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'task-suggest-batch',
            context: {
              goals: activeGoals.map((goal) => ({
                id: goal.id,
                name: goal.name,
                areaType: goal.userOverriddenArea ?? goal.areaType,
              })),
              existingTasks: suggestedTasks.map((task) => task.name),
            },
          }),
        })

        if (!response.ok) {
          throw new Error('AI request failed')
        }

        const result = await response.json()
        const suggestions = Array.isArray(result?.data?.suggestions) ? result.data.suggestions : []

        const taskNamesByGoal = new Map<string, string[]>()

        for (const item of suggestions) {
          if (typeof item?.goalId !== 'string') continue
          const names = Array.isArray(item?.tasks)
            ? uniqueTaskNames(
                item.tasks
                  .map((task: { name?: string }) => task?.name ?? '')
                  .filter((value: string) => Boolean(value))
              ).slice(0, 2)
            : []

          if (names.length > 0) {
            taskNamesByGoal.set(item.goalId, names)
          }
        }

        const nextTasks = activeGoals.flatMap((goal) => {
          const candidateNames =
            taskNamesByGoal.get(goal.id) ?? localFallbackTaskMap.get(goal.id) ?? []

          return uniqueTaskNames(candidateNames)
            .slice(0, 2)
            .map((name) => ({
              goalId: goal.id,
              name,
              accepted: true,
            }))
        })

        if (nextTasks.length > 0) {
          setSuggestedTasks(nextTasks)
        }

        setAiEnhanceStatus('done')
      } catch {
        setAiEnhanceStatus('error')
        trackEvent(ANALYTICS_EVENTS.ONBOARDING_AI_ENHANCE_FAILED, {
          goal_count: activeGoals.length,
        })
      }
    })()
  }, [
    activeGoals,
    hasAiSeededTasks,
    localFallbackTaskMap,
    setAiEnhanceStatus,
    setSuggestedTasks,
    suggestedTasks,
  ])

  const handleBack = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_BACK, { step: 'first-action' })
    prevStep()
  }

  const handleStart = async () => {
    if (!canProceed || isPending) return

    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_NEXT, {
      step: 'first-action',
      selected_goal_count: activeGoalIds.length,
      has_primary_task: true,
    })

    await complete()
  }

  useStepKeyboard({ onNext: canProceed ? handleStart : undefined, onBack: handleBack, canProceed })

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4">
        <h2 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
          내일 바로 시작할 1가지를 골라주세요
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          체크된 실천은 같이 저장되고, 1순위는 하나만 고를 수 있어요.
        </p>
      </div>

      {aiEnhanceStatus === 'loading' && (
        <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">
          AI가 실천안을 다듬고 있어요. 기다리지 않고 바로 시작할 수 있어요.
        </p>
      )}
      {aiEnhanceStatus === 'error' && (
        <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">
          AI 추천이 지연되어 기본 실천안을 준비했어요.
        </p>
      )}

      <div className="space-y-4 overflow-y-auto pb-6">
        {activeGoals.map((goal, index) => {
          const areaType = (goal.userOverriddenArea ?? goal.areaType) as AreaType
          const area = getAreaPreset(areaType)
          const goalTasks = suggestedTasks.filter((task) => task.goalId === goal.id)

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {area.emoji} {area.name}
                  </span>
                </div>
                <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
                  {goal.name}
                </p>
                <div className="space-y-2">
                  {goalTasks.map((task) => {
                    const taskKey = buildSuggestedTaskKey(task.goalId, task.name)
                    const isPrimary = primaryTaskId === taskKey

                    return (
                      <div
                        key={taskKey}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-2 py-2',
                          task.accepted
                            ? 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]'
                            : 'border-[var(--color-border)] bg-[var(--color-bg-tertiary)] opacity-70'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleTaskAccepted(task.goalId, task.name)}
                          disabled={isPending}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-secondary)]"
                          aria-label={task.accepted ? '실천 제외' : '실천 포함'}
                        >
                          {task.accepted ? (
                            <Check className="h-4 w-4 text-[var(--color-done)]" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setPrimaryTask(taskKey)}
                          disabled={!task.accepted || isPending}
                          className={cn(
                            'flex flex-1 items-center justify-between rounded-md px-2 py-1 text-left text-sm',
                            isPrimary
                              ? 'text-[var(--color-primary-600)]'
                              : 'text-[var(--color-text-primary)]'
                          )}
                        >
                          <span>{task.name}</span>
                          <span className="text-xs">
                            {isPrimary ? '1순위' : task.accepted ? '선택' : '미포함'}
                          </span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-[var(--color-miss-bg)] p-3 text-sm text-[var(--color-miss)]">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 mt-auto border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]/95 pt-4 pb-1 backdrop-blur">
        {!canProceed && (
          <p className="mb-2 text-center text-xs text-[var(--color-text-tertiary)]">
            1순위 실천 1개를 선택해주세요.
          </p>
        )}
        <div className="space-y-2">
          <Button onClick={handleStart} disabled={!canProceed || isPending} className="h-11 w-full">
            {isPending ? '설정 중...' : '이대로 시작'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={isPending}
            className="w-full gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            이전으로
          </Button>
        </div>
      </div>
    </div>
  )
}
