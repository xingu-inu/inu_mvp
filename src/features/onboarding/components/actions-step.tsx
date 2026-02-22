'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Check, X } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { AREA_PRESETS_EXTENDED } from '@/lib/constants/onboarding'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useStepKeyboard } from '../hooks/use-step-keyboard'
import type { SuggestedTask } from '@/stores/onboarding.store'

interface GoalTaskState {
  status: 'loading' | 'error' | 'done'
}

export function ActionsStep() {
  const {
    organizedGoals,
    activeGoalIds,
    suggestedTasks,
    setSuggestedTasks,
    toggleTaskAccepted,
    nextStep,
    prevStep,
  } = useOnboardingStore()

  const activeGoals = useMemo(
    () => organizedGoals.filter((g) => activeGoalIds.includes(g.id)),
    [organizedGoals, activeGoalIds]
  )

  const [goalStates, setGoalStates] = useState<Record<string, GoalTaskState>>({})
  const fetchedRef = useRef(false)

  // Fetch AI-suggested tasks on mount
  useEffect(() => {
    if (fetchedRef.current) return
    // Skip if we already have tasks (re-visit)
    if (suggestedTasks.length > 0) {
      const states: Record<string, GoalTaskState> = {}
      for (const goal of activeGoals) {
        states[goal.id] = { status: 'done' }
      }
      setGoalStates(states)
      return
    }

    fetchedRef.current = true

    const fetchTasks = async () => {
      const allTasks: SuggestedTask[] = []
      const states: Record<string, GoalTaskState> = {}

      // Initialize all as loading
      for (const goal of activeGoals) {
        states[goal.id] = { status: 'loading' }
      }
      setGoalStates({ ...states })

      // Fetch tasks for each active goal
      await Promise.allSettled(
        activeGoals.map(async (goal) => {
          try {
            const effectiveArea = goal.userOverriddenArea ?? goal.areaType
            const areaPreset = AREA_PRESETS_EXTENDED.find((a) => a.type === effectiveArea)

            const res = await fetch('/api/ai/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'task-suggest',
                context: {
                  areas: [
                    {
                      name: areaPreset?.name ?? effectiveArea,
                      type: effectiveArea,
                      emoji: areaPreset?.emoji ?? '',
                    },
                  ],
                  goals: [{ name: goal.name, areaType: effectiveArea }],
                },
              }),
            })

            if (!res.ok) throw new Error('Failed to fetch')

            const data = await res.json()
            let taskNames: string[] = []

            try {
              const parsed = JSON.parse(data.content)
              if (Array.isArray(parsed.tasks)) {
                taskNames = parsed.tasks.map((t: { name: string }) => t.name).slice(0, 2)
              } else if (Array.isArray(parsed)) {
                taskNames = parsed.map((t: { name: string }) => t.name).slice(0, 2)
              }
            } catch {
              // Try to extract from raw content
              taskNames = []
            }

            const goalTasks: SuggestedTask[] = taskNames.map((name) => ({
              goalId: goal.id,
              name,
              accepted: true,
            }))

            allTasks.push(...goalTasks)
            states[goal.id] = { status: 'done' }
            setGoalStates({ ...states })
          } catch {
            states[goal.id] = { status: 'error' }
            setGoalStates({ ...states })
          }
        })
      )

      if (allTasks.length > 0) {
        setSuggestedTasks(allTasks)
      }
    }

    fetchTasks()
  }, [activeGoals, suggestedTasks.length, setSuggestedTasks])

  const handleNext = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'actions' })
    nextStep()
  }

  const handleSkip = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
      step: 'actions',
      skipped: true,
    })
    nextStep()
  }

  useStepKeyboard({ onNext: handleNext, onBack: prevStep, canProceed: true })

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-1 text-xl font-bold text-[var(--color-text-primary)]">
        내일부터 바로 시작해볼까요?
      </h2>
      <p className="mb-5 text-sm text-[var(--color-text-secondary)]">작은 실천부터 시작하면 돼요</p>

      {/* Per-goal task cards */}
      <div className="mb-4 space-y-3">
        {activeGoals.map((goal, goalIdx) => {
          const effectiveArea = goal.userOverriddenArea ?? goal.areaType
          const areaPreset = AREA_PRESETS_EXTENDED.find((a) => a.type === effectiveArea)
          const goalState = goalStates[goal.id]
          const goalTasks = suggestedTasks.filter((t) => t.goalId === goal.id)

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: goalIdx * 0.1 }}
            >
              <Card className="p-4">
                {/* Goal header */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-base">{areaPreset?.emoji ?? '🎯'}</span>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {goal.name}
                  </span>
                </div>

                {/* Loading skeleton */}
                {goalState?.status === 'loading' && (
                  <div className="space-y-2">
                    {[75, 60].map((width, i) => (
                      <motion.div
                        key={i}
                        className="h-10 rounded-lg bg-[var(--color-bg-tertiary)]"
                        style={{ width: `${width}%` }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                )}

                {/* Error state */}
                {goalState?.status === 'error' && (
                  <p className="text-sm text-[var(--color-text-tertiary)]">
                    제안을 불러오지 못했어요
                  </p>
                )}

                {/* Task list */}
                <AnimatePresence>
                  {goalState?.status === 'done' && goalTasks.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-2"
                    >
                      {goalTasks.map((task) => (
                        <button
                          key={`${task.goalId}-${task.name}`}
                          type="button"
                          onClick={() => toggleTaskAccepted(task.goalId, task.name)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                            task.accepted
                              ? 'bg-[var(--color-done-bg)]'
                              : 'bg-[var(--color-bg-tertiary)]'
                          )}
                        >
                          {task.accepted ? (
                            <Check className="h-4 w-4 shrink-0 text-[var(--color-done)]" />
                          ) : (
                            <X className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
                          )}
                          <span
                            className={cn(
                              'flex-1 text-sm',
                              task.accepted
                                ? 'text-[var(--color-text-primary)]'
                                : 'text-[var(--color-text-tertiary)] line-through'
                            )}
                          >
                            {task.name}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* No tasks after loading */}
                {goalState?.status === 'done' && goalTasks.length === 0 && (
                  <p className="text-sm text-[var(--color-text-tertiary)]">제안된 실천이 없어요</p>
                )}
              </Card>
            </motion.div>
          )
        })}
      </div>

      <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">하나만 해도 충분해요</p>

      {/* Navigation */}
      <div className="mt-auto space-y-2 pt-6">
        <Button onClick={handleNext} className="w-full">
          다음
        </Button>
        <Button variant="ghost" size="sm" onClick={handleSkip} className="w-full">
          건너뛰기
        </Button>
        <Button variant="ghost" size="sm" onClick={prevStep} className="w-full gap-1">
          <ChevronLeft className="h-4 w-4" />
          이전으로
        </Button>
      </div>
    </div>
  )
}
