'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Card } from '@/components/ui'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { useCompleteOnboarding } from '../hooks/use-complete-onboarding'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useStepKeyboard } from '../hooks/use-step-keyboard'
import { Sparkles, ChevronLeft, Pencil, Check, X } from 'lucide-react'
import { AREA_PRESETS_EXTENDED } from '@/lib/constants/onboarding'
import { cn } from '@/lib/utils'
import type { SuggestedTask } from '@/stores/onboarding.store'

interface GoalTaskState {
  status: 'loading' | 'error' | 'done'
}

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

export function LifeOrganizedStep() {
  const {
    organizedGoals,
    activeGoalIds,
    generatedDirection,
    directionMode,
    editedDirection,
    suggestedTasks,
    setSuggestedTasks,
    setDirectionMode,
    setEditedDirection,
    setGeneratedDirection,
    toggleActiveGoal,
    toggleTaskAccepted,
    prevStep,
  } = useOnboardingStore()

  const { complete, isPending, error } = useCompleteOnboarding()

  const activeGoals = useMemo(
    () => organizedGoals.filter((g) => activeGoalIds.includes(g.id)),
    [organizedGoals, activeGoalIds]
  )

  // Group ALL goals by area (not just active) so user can toggle
  const areaGroups = useMemo(() => {
    const groups: Record<
      string,
      { area: (typeof AREA_PRESETS_EXTENDED)[0]; goals: typeof organizedGoals }
    > = {}
    for (const goal of organizedGoals) {
      const effectiveArea = goal.userOverriddenArea ?? goal.areaType
      const areaPreset = AREA_PRESETS_EXTENDED.find((a) => a.type === effectiveArea)
      const key = effectiveArea
      if (!groups[key]) {
        groups[key] = {
          area: areaPreset ?? { name: '기타', type: 'custom', emoji: '🎯', color: '#8a7a65' },
          goals: [],
        }
      }
      groups[key].goals.push(goal)
    }
    return Object.values(groups)
  }, [organizedGoals])

  const canProceed = activeGoalIds.length >= 1

  // Direction states
  const [isDirectionLoading, setIsDirectionLoading] = useState(true)
  const [showDirection, setShowDirection] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [localEdit, setLocalEdit] = useState(editedDirection || generatedDirection || '')
  const [directionSkipped, setDirectionSkipped] = useState(false)

  // Task states
  const [goalStates, setGoalStates] = useState<Record<string, GoalTaskState>>({})
  const fetchedRef = useRef(false)

  // Fetch AI direction on mount
  useEffect(() => {
    if (generatedDirection || directionSkipped) {
      setIsDirectionLoading(false)
      setShowDirection(true)
      return
    }

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
  }, [generatedDirection, activeGoals, setGeneratedDirection, directionSkipped])

  // Shimmer → reveal
  useEffect(() => {
    if (!isDirectionLoading) return
    if (!generatedDirection) return
    const timer = setTimeout(() => {
      setIsDirectionLoading(false)
      setShowDirection(true)
    }, 800)
    return () => clearTimeout(timer)
  }, [isDirectionLoading, generatedDirection])

  // Fetch AI-suggested tasks on mount (uses organizedGoals, not just active)
  useEffect(() => {
    if (fetchedRef.current) return
    if (suggestedTasks.length > 0) {
      const states: Record<string, GoalTaskState> = {}
      for (const goal of organizedGoals) {
        states[goal.id] = { status: 'done' }
      }
      setGoalStates(states)
      return
    }

    fetchedRef.current = true

    const fetchTasks = async () => {
      const allTasks: SuggestedTask[] = []
      const states: Record<string, GoalTaskState> = {}

      for (const goal of organizedGoals) {
        states[goal.id] = { status: 'loading' }
      }
      setGoalStates({ ...states })

      await Promise.allSettled(
        organizedGoals.map(async (goal) => {
          try {
            const effectiveArea = goal.userOverriddenArea ?? goal.areaType
            const areaPreset = AREA_PRESETS_EXTENDED.find((a) => a.type === effectiveArea)

            const res = await fetch('/api/ai/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'task-suggest',
                context: {
                  direction: null,
                  areas: [
                    {
                      id: effectiveArea,
                      name: areaPreset?.name ?? effectiveArea,
                      emoji: areaPreset?.emoji ?? '',
                      type: effectiveArea,
                      why: null,
                    },
                  ],
                  goals: [
                    {
                      id: goal.id,
                      name: goal.name,
                      areaId: effectiveArea,
                      areaName: areaPreset?.name ?? effectiveArea,
                      areaEmoji: areaPreset?.emoji ?? '',
                      status: 'active',
                      why: null,
                    },
                  ],
                  existingTasks: [],
                },
              }),
            })

            if (!res.ok) throw new Error('Failed to fetch')

            const data = await res.json()
            let taskNames: string[] = []

            if (data.success && data.data?.suggestions) {
              const goalSuggestion = data.data.suggestions.find(
                (s: { goalId: string }) => s.goalId === goal.id
              )
              if (goalSuggestion?.tasks && Array.isArray(goalSuggestion.tasks)) {
                taskNames = goalSuggestion.tasks.map((t: { name: string }) => t.name).slice(0, 2)
              }
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
  }, [organizedGoals, suggestedTasks.length, setSuggestedTasks])

  const handleStart = async () => {
    if (directionMode === null && !directionSkipped) {
      setDirectionMode('accept')
    }
    if (isEditing) {
      setEditedDirection(localEdit)
    }
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'life-organized' })
    await complete()
  }

  const handleSkipAll = async () => {
    setDirectionMode('explore')
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
      step: 'life-organized',
      skipped: true,
    })
    await complete()
  }

  useStepKeyboard({ onBack: prevStep, canProceed: false })

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="mb-2 text-xl font-bold text-[var(--color-text-primary)]">
          쏟아낸 것들을 정리했어요!
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">넣고 싶은 것만 골라보세요</p>
      </div>

      {/* Section 1 - 나의 방향 */}
      {!directionSkipped && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">나의 방향</h3>

          {isEditing ? (
            <div>
              <textarea
                value={localEdit}
                onChange={(e) => setLocalEdit(e.target.value)}
                placeholder="나의 인생 방향..."
                rows={3}
                className="mb-2 w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary-500)] focus:outline-none"
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditedDirection(localEdit)
                    setDirectionMode('edit')
                    setIsEditing(false)
                  }}
                  disabled={localEdit.length < 5}
                  className="flex-1"
                >
                  저장
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Card variant="hero" className="relative mb-3 overflow-hidden p-6">
                <div
                  className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-50)] via-transparent to-[var(--color-ai-bg)] opacity-50"
                  aria-hidden="true"
                />
                <div className="relative">
                  <AnimatePresence mode="wait">
                    {isDirectionLoading ? (
                      <motion.div
                        key="shimmer"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex gap-2"
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setLocalEdit(editedDirection || generatedDirection || '')
                        setIsEditing(true)
                      }}
                      className="gap-1.5"
                      disabled={isPending}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      수정
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDirectionMode('explore')
                        setDirectionSkipped(true)
                      }}
                      className="gap-1.5"
                      disabled={isPending}
                    >
                      건너뛰기
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      )}

      {/* Section 2 - 만들어진 목표와 실천 (토글 가능) */}
      <div className="mb-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">만들어진 목표</h3>
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {activeGoalIds.length}/{organizedGoals.length}개 선택
          </span>
        </div>

        <div className="space-y-4">
          {areaGroups.map((group, groupIdx) => (
            <motion.div
              key={group.area.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIdx * 0.1 }}
            >
              {/* Area header */}
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: group.area.color }}
                />
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {group.area.emoji} {group.area.name}
                </span>
              </div>

              {/* Goals in this area */}
              <div className="space-y-2">
                {group.goals.map((goal) => {
                  const isActive = activeGoalIds.includes(goal.id)
                  const goalState = goalStates[goal.id]
                  const goalTasks = suggestedTasks.filter((t) => t.goalId === goal.id)

                  return (
                    <Card
                      key={goal.id}
                      className={cn('p-3 transition-opacity', !isActive && 'opacity-50')}
                    >
                      {/* Goal toggle row */}
                      <button
                        type="button"
                        onClick={() => toggleActiveGoal(goal.id)}
                        className="flex w-full items-center gap-2.5 text-left"
                        disabled={isPending}
                      >
                        {isActive ? (
                          <Check className="h-4 w-4 shrink-0 text-[var(--color-done)]" />
                        ) : (
                          <X className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
                        )}
                        <span
                          className={cn(
                            'flex-1 text-sm font-medium',
                            isActive
                              ? 'text-[var(--color-text-primary)]'
                              : 'text-[var(--color-text-tertiary)] line-through'
                          )}
                        >
                          {goal.name}
                        </span>
                      </button>

                      {/* Tasks (only show for active goals) */}
                      {isActive && (
                        <>
                          {goalState?.status === 'loading' && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-ai)]">
                              <Sparkles className="h-3 w-3 animate-pulse" />
                              <span>실천 만드는 중...</span>
                            </div>
                          )}

                          {goalState?.status === 'done' && goalTasks.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {goalTasks.map((task) => (
                                <button
                                  key={`${task.goalId}-${task.name}`}
                                  type="button"
                                  onClick={() => toggleTaskAccepted(task.goalId, task.name)}
                                  disabled={isPending}
                                  className={cn(
                                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                                    task.accepted
                                      ? 'bg-[var(--color-done-bg)]'
                                      : 'bg-[var(--color-bg-tertiary)]'
                                  )}
                                >
                                  {task.accepted ? (
                                    <Check className="h-3 w-3 shrink-0 text-[var(--color-done)]" />
                                  ) : (
                                    <X className="h-3 w-3 shrink-0 text-[var(--color-text-tertiary)]" />
                                  )}
                                  <span
                                    className={cn(
                                      'flex-1 text-xs',
                                      task.accepted
                                        ? 'text-[var(--color-text-secondary)]'
                                        : 'text-[var(--color-text-tertiary)] line-through'
                                    )}
                                  >
                                    {task.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </Card>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </div>

        <p className="mt-3 text-xs text-[var(--color-text-tertiary)]">
          목표와 실천은 나중에 언제든 수정할 수 있어요
        </p>
      </div>

      {/* Section 3 - 앱 활용법 */}
      <motion.div
        className="mb-6 rounded-xl bg-[var(--color-bg-secondary)] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="mb-3 text-xs font-semibold text-[var(--color-text-primary)]">
          이렇게 활용하세요
        </p>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5 text-xs text-[var(--color-text-secondary)]">
            <span className="shrink-0">🏠</span>
            <span>
              <strong className="text-[var(--color-text-primary)]">홈</strong>에서 매일 할 일을
              체크인해요
            </span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-[var(--color-text-secondary)]">
            <span className="shrink-0">📋</span>
            <span>
              <strong className="text-[var(--color-text-primary)]">로드맵</strong>에서 목표를
              관리하고 새로 추가해요
            </span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-[var(--color-text-secondary)]">
            <span className="shrink-0">📊</span>
            <span>
              <strong className="text-[var(--color-text-primary)]">리뷰</strong>에서 일주일을
              돌아보고 성장을 확인해요
            </span>
          </div>
        </div>
      </motion.div>

      {/* Error display */}
      {error && (
        <div className="mb-4 rounded-xl bg-[var(--color-miss-bg)] p-3 text-sm text-[var(--color-miss)]">
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={handleStart} className="mt-2">
            다시 시도
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-auto space-y-2 pt-4">
        <Button onClick={handleStart} disabled={!canProceed || isPending} className="w-full">
          {isPending ? '설정 중...' : '시작하기'}
        </Button>
        {!canProceed && (
          <p className="text-center text-xs text-[var(--color-text-tertiary)]">
            최소 1개의 목표를 선택해주세요
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipAll}
          disabled={isPending}
          className="w-full"
        >
          나중에 설정할게요
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={prevStep}
          disabled={isPending}
          className="w-full gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          이전으로
        </Button>
      </div>
    </div>
  )
}
