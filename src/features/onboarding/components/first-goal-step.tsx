'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Chip, Input, Card } from '@/components/ui'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { SAMPLE_GOALS, SAMPLE_TASKS } from '@/lib/constants/onboarding'
import { useStepKeyboard } from '../hooks/use-step-keyboard'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AreaType } from '@/types/entities'

export function FirstGoalStep() {
  const {
    selectedAreas,
    selectedGoalArea,
    firstGoal,
    firstTask,
    setGoalArea,
    setGoal,
    setTask,
    goToCompletion,
    prevStep,
  } = useOnboardingStore()

  const [showCustomGoal, setShowCustomGoal] = useState(() => {
    if (!firstGoal || !selectedGoalArea) return false
    const samples = SAMPLE_GOALS[selectedGoalArea.type as AreaType] || []
    return !samples.includes(firstGoal.name)
  })
  const [customGoalInput, setCustomGoalInput] = useState(firstGoal?.name || '')
  const [showCustomTask, setShowCustomTask] = useState(() => {
    if (!firstTask || !selectedGoalArea) return false
    const samples = SAMPLE_TASKS[selectedGoalArea.type as AreaType] || []
    return !samples.includes(firstTask.name)
  })
  const [customTaskInput, setCustomTaskInput] = useState(firstTask?.name || '')

  const handleAreaSelect = (area: (typeof selectedAreas)[number]) => {
    if (selectedGoalArea?.type === area.type) {
      setGoalArea(null)
      setGoal(null)
      setTask(null)
    } else {
      setGoalArea(area)
      setGoal(null)
      setTask(null)
      setShowCustomGoal(false)
      setCustomGoalInput('')
      setShowCustomTask(false)
      setCustomTaskInput('')
    }
  }

  const handleGoalSelect = (goalName: string) => {
    if (firstGoal?.name === goalName) {
      setGoal(null)
      setTask(null)
    } else {
      setGoal({ name: goalName })
      setTask(null)
      setShowCustomTask(false)
      setCustomTaskInput('')
    }
  }

  const handleCustomGoalChange = (value: string) => {
    setCustomGoalInput(value)
    if (value.trim()) {
      setGoal({ name: value.trim() })
      setTask(null)
    } else {
      setGoal(null)
      setTask(null)
    }
  }

  const handleTaskSelect = (taskName: string) => {
    if (firstTask?.name === taskName) {
      setTask(null)
    } else {
      setTask({ name: taskName })
    }
  }

  const handleCustomTaskChange = (value: string) => {
    setCustomTaskInput(value)
    setTask(value.trim() ? { name: value.trim() } : null)
  }

  const handleComplete = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'first-goal' })
    goToCompletion()
  }

  const handleSkip = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'first-goal' })
    setGoalArea(null)
    setGoal(null)
    setTask(null)
    goToCompletion()
  }

  const sampleGoals = selectedGoalArea ? SAMPLE_GOALS[selectedGoalArea.type as AreaType] || [] : []
  const sampleTasks = selectedGoalArea ? SAMPLE_TASKS[selectedGoalArea.type as AreaType] || [] : []
  const canStart = selectedGoalArea && firstGoal

  useStepKeyboard({ onBack: prevStep, canProceed: false })

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-2 text-xl font-bold text-[var(--color-text-primary)]">
        첫 번째 목표를 만들어볼까요?
      </h2>
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
        작은 것부터 시작해도 괜찮아요
      </p>

      {/* Section A: Area chips from Step 3 selection */}
      <section className="mb-6">
        <p className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
          어떤 영역부터 시작할까요?
        </p>
        <div className="flex flex-wrap gap-2">
          {selectedAreas.map((area) => {
            const isSelected = selectedGoalArea?.type === area.type
            return (
              <Chip
                key={area.type}
                variant="selection"
                selected={isSelected}
                onClick={() => handleAreaSelect(area)}
                emoji={area.emoji}
                style={
                  isSelected
                    ? ({
                        borderColor: area.color,
                        backgroundColor: `${area.color}15`,
                      } as React.CSSProperties)
                    : undefined
                }
                className={cn(isSelected && 'border-2')}
              >
                {area.name}
              </Chip>
            )
          })}
        </div>
      </section>

      {/* Section B: Goal selection (after area) */}
      <AnimatePresence>
        {selectedGoalArea && (
          <motion.section
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="mb-6 overflow-hidden"
            data-section="goal"
            onAnimationComplete={() => {
              document
                .querySelector('[data-section="goal"]')
                ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }}
          >
            <Card className="bg-transparent p-4 shadow-none hover:translate-y-0 hover:shadow-none">
              <p className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
                어떤 목표를 이루고 싶으세요?
              </p>
              <div className="space-y-2">
                {sampleGoals.map((goal, index) => (
                  <motion.button
                    key={goal}
                    type="button"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleGoalSelect(goal)}
                    className={cn(
                      'w-full cursor-pointer rounded-xl border-2 px-4 py-3 text-left text-sm transition-all',
                      firstGoal?.name === goal
                        ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]'
                    )}
                  >
                    {goal}
                  </motion.button>
                ))}

                {!showCustomGoal ? (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: sampleGoals.length * 0.05 }}
                    onClick={() => setShowCustomGoal(true)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] px-4 py-3 text-left text-sm text-[var(--color-text-tertiary)] transition-all hover:border-[var(--color-border-hover)]"
                  >
                    <Plus className="h-4 w-4" />
                    직접 입력
                  </motion.button>
                ) : (
                  <Input
                    value={customGoalInput}
                    onChange={(e) => handleCustomGoalChange(e.target.value)}
                    placeholder="나의 목표..."
                    className={cn(
                      'w-full',
                      customGoalInput.trim()
                        ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                        : ''
                    )}
                    autoFocus
                  />
                )}
              </div>
            </Card>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Section C: Task selection (after goal, optional) */}
      <AnimatePresence>
        {firstGoal && selectedGoalArea && (
          <motion.section
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="mb-6 overflow-hidden"
            data-section="task"
            onAnimationComplete={() => {
              document
                .querySelector('[data-section="task"]')
                ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }}
          >
            <Card className="bg-transparent p-4 shadow-none hover:translate-y-0 hover:shadow-none">
              <p className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">
                이 목표를 위해 매일 할 수 있는 작은 실천은?
              </p>
              <p className="mb-3 text-sm text-[var(--color-text-tertiary)]">
                선택하지 않아도 괜찮아요
              </p>
              <div className="space-y-2">
                {sampleTasks.map((task, index) => (
                  <motion.button
                    key={task}
                    type="button"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleTaskSelect(task)}
                    className={cn(
                      'w-full cursor-pointer rounded-xl border-2 px-4 py-3 text-left text-sm transition-all',
                      firstTask?.name === task
                        ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)]'
                    )}
                  >
                    {task}
                  </motion.button>
                ))}

                {!showCustomTask ? (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: sampleTasks.length * 0.05 }}
                    onClick={() => setShowCustomTask(true)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] px-4 py-3 text-left text-sm text-[var(--color-text-tertiary)] transition-all hover:border-[var(--color-border-hover)]"
                  >
                    <Plus className="h-4 w-4" />
                    직접 입력
                  </motion.button>
                ) : (
                  <Input
                    value={customTaskInput}
                    onChange={(e) => handleCustomTaskChange(e.target.value)}
                    placeholder="매일 할 실천..."
                    className={cn(
                      'w-full',
                      customTaskInput.trim()
                        ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                        : ''
                    )}
                    autoFocus
                  />
                )}
              </div>
            </Card>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-auto space-y-3 pt-6">
        <Button onClick={handleComplete} disabled={!canStart} size="lg" className="w-full gap-2">
          시작하기
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="w-full text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
        >
          나중에 할게요
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={prevStep} className="w-full gap-1">
          <ChevronLeft className="h-4 w-4" />
          이전으로
        </Button>
      </div>
    </div>
  )
}
