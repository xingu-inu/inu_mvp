'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, ChevronRight, ChevronLeft, Pencil, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOnboardingStore } from '@/stores/onboarding.store'
import type { V5ReviewArea } from '@/stores/onboarding.store'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useStepKeyboard } from '../hooks/use-step-keyboard'

export function ReviewStepV5() {
  const { v5ReviewAreas, v5Summary, setV5ReviewAreas, nextStep, prevStep } = useOnboardingStore()

  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(
    () => new Set(v5ReviewAreas.map((a) => a._id))
  )
  const [editingId, setEditingId] = useState<string | null>(null)

  const checkedCount = countCheckedItems(v5ReviewAreas)
  const canProceed = checkedCount > 0

  function toggleAreaExpanded(areaId: string) {
    setExpandedAreas((prev) => {
      const next = new Set(prev)
      if (next.has(areaId)) next.delete(areaId)
      else next.add(areaId)
      return next
    })
  }

  function toggleAreaChecked(areaId: string) {
    setV5ReviewAreas(
      v5ReviewAreas.map((a) => {
        if (a._id !== areaId) return a
        const newChecked = !a._checked
        return {
          ...a,
          _checked: newChecked,
          goals: a.goals.map((g) => ({
            ...g,
            _checked: newChecked,
            tasks: g.tasks.map((t) => ({ ...t, _checked: newChecked })),
          })),
        }
      })
    )
  }

  function toggleGoalChecked(areaId: string, goalId: string) {
    setV5ReviewAreas(
      v5ReviewAreas.map((a) => {
        if (a._id !== areaId) return a
        const updatedGoals = a.goals.map((g) => {
          if (g._id !== goalId) return g
          const newChecked = !g._checked
          return {
            ...g,
            _checked: newChecked,
            tasks: g.tasks.map((t) => ({ ...t, _checked: newChecked })),
          }
        })
        return { ...a, goals: updatedGoals, _checked: updatedGoals.some((g) => g._checked) }
      })
    )
  }

  function toggleTaskChecked(areaId: string, goalId: string, taskId: string) {
    setV5ReviewAreas(
      v5ReviewAreas.map((a) => {
        if (a._id !== areaId) return a
        const updatedGoals = a.goals.map((g) => {
          if (g._id !== goalId) return g
          const updatedTasks = g.tasks.map((t) =>
            t._id === taskId ? { ...t, _checked: !t._checked } : t
          )
          return { ...g, tasks: updatedTasks, _checked: updatedTasks.some((t) => t._checked) }
        })
        return { ...a, goals: updatedGoals, _checked: updatedGoals.some((g) => g._checked) }
      })
    )
  }

  function updateGoalName(areaId: string, goalId: string, value: string) {
    setV5ReviewAreas(
      v5ReviewAreas.map((a) =>
        a._id === areaId
          ? { ...a, goals: a.goals.map((g) => (g._id === goalId ? { ...g, name: value } : g)) }
          : a
      )
    )
  }

  function updateTaskName(areaId: string, goalId: string, taskId: string, value: string) {
    setV5ReviewAreas(
      v5ReviewAreas.map((a) =>
        a._id === areaId
          ? {
              ...a,
              goals: a.goals.map((g) =>
                g._id === goalId
                  ? {
                      ...g,
                      tasks: g.tasks.map((t) => (t._id === taskId ? { ...t, name: value } : t)),
                    }
                  : g
              ),
            }
          : a
      )
    )
  }

  const handleNext = () => {
    if (!canProceed) return
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, { step: 'review-v5' })
    nextStep()
  }

  const handleBack = () => {
    prevStep()
  }

  useStepKeyboard({ onNext: canProceed ? handleNext : undefined, onBack: handleBack, canProceed })

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-5">
        <h2 className="mb-1 text-xl font-bold text-[var(--color-text-primary)]">
          이렇게 정리했어요
        </h2>
        {v5Summary && <p className="text-sm text-[var(--color-text-secondary)]">{v5Summary}</p>}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto pb-4">
        {v5ReviewAreas.map((area, areaIdx) => (
          <motion.div
            key={area._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: areaIdx * 0.06 }}
            className="overflow-hidden rounded-xl border border-[var(--color-border)]"
          >
            {/* Area header */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleAreaExpanded(area._id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleAreaExpanded(area._id)
                }
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              <ReviewCheckbox
                checked={area._checked}
                onChange={(e) => {
                  e.stopPropagation()
                  toggleAreaChecked(area._id)
                }}
              />
              <span
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: area.color }}
              />
              <span className="text-sm">{area.emoji}</span>
              <span className="flex-1 text-left text-sm font-medium text-[var(--color-text-primary)]">
                {area.name}
              </span>
              <span className="text-[10px] text-[var(--color-text-quaternary)]">
                {area.goals.length}개 목표
              </span>
              {expandedAreas.has(area._id) ? (
                <ChevronDown className="h-4 w-4 text-[var(--color-text-quaternary)]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--color-text-quaternary)]" />
              )}
            </div>

            {/* Goals / Tasks */}
            <AnimatePresence>
              {expandedAreas.has(area._id) && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50">
                    {area.goals.map((goal) => (
                      <div
                        key={goal._id}
                        className="border-b border-[var(--color-border)]/60 last:border-b-0"
                      >
                        {/* Goal row */}
                        <div className="group/goal flex items-center gap-2 px-3 py-2 pl-9">
                          <ReviewCheckbox
                            checked={goal._checked}
                            onChange={() => toggleGoalChecked(area._id, goal._id)}
                          />
                          {editingId === goal._id ? (
                            <input
                              type="text"
                              value={goal.name}
                              onChange={(e) => updateGoalName(area._id, goal._id, e.target.value)}
                              onBlur={() => setEditingId(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                              autoFocus
                              className="flex-1 rounded-md border border-[var(--color-primary-500)] bg-[var(--color-bg-primary)] px-2 py-0.5 text-sm focus:outline-none"
                            />
                          ) : (
                            <>
                              <div className="min-w-0 flex-1">
                                <span
                                  className={`block text-sm ${
                                    goal._checked
                                      ? 'text-[var(--color-text-primary)]'
                                      : 'text-[var(--color-text-quaternary)] line-through'
                                  }`}
                                >
                                  {goal.name}
                                </span>
                                {goal.why && (
                                  <span className="block truncate text-[11px] text-[var(--color-text-quaternary)]">
                                    {goal.why}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => setEditingId(goal._id)}
                                className="flex-shrink-0 rounded p-1 text-[var(--color-text-quaternary)] opacity-0 transition-opacity group-hover/goal:opacity-100 hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Tasks */}
                        {goal.tasks.map((task) => (
                          <div
                            key={task._id}
                            className="group/task flex items-center gap-2 px-3 py-1.5 pl-14"
                          >
                            <ReviewCheckbox
                              checked={task._checked}
                              onChange={() => toggleTaskChecked(area._id, goal._id, task._id)}
                              size="sm"
                            />
                            {editingId === task._id ? (
                              <input
                                type="text"
                                value={task.name}
                                onChange={(e) =>
                                  updateTaskName(area._id, goal._id, task._id, e.target.value)
                                }
                                onBlur={() => setEditingId(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                                autoFocus
                                className="flex-1 rounded-md border border-[var(--color-primary-500)] bg-[var(--color-bg-primary)] px-2 py-0.5 text-xs focus:outline-none"
                              />
                            ) : (
                              <>
                                <span
                                  className={`flex-1 text-xs ${
                                    task._checked
                                      ? 'text-[var(--color-text-secondary)]'
                                      : 'text-[var(--color-text-quaternary)] line-through'
                                  }`}
                                >
                                  {task.name}
                                </span>
                                <span className="flex-shrink-0 rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-quaternary)]">
                                  {formatRepeatType(task.repeat_type)} · {task.duration_minutes}분
                                </span>
                                <button
                                  onClick={() => setEditingId(task._id)}
                                  className="flex-shrink-0 rounded p-1 text-[var(--color-text-quaternary)] opacity-0 transition-opacity group-hover/task:opacity-100 hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <p className="mb-4 text-xs text-[var(--color-text-tertiary)]">
        목표와 할 일은 나중에 언제든 수정할 수 있어요
      </p>

      <div className="space-y-2">
        <Button onClick={handleNext} disabled={!canProceed} className="w-full" size="lg">
          <Check className="h-4 w-4" />
          {checkedCount}개 항목으로 계속하기
        </Button>
        <Button variant="ghost" size="sm" onClick={handleBack} className="w-full gap-1">
          <ChevronLeft className="h-4 w-4" />
          다시 쏟아내기
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ── Helpers ──

function ReviewCheckbox({
  checked,
  onChange,
  size = 'md',
}: {
  checked: boolean
  onChange: (e: React.MouseEvent) => void
  size?: 'sm' | 'md'
}) {
  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'

  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation()
        onChange(e)
      }}
      className={`flex ${sizeClass} flex-shrink-0 items-center justify-center rounded border transition-colors ${
        checked
          ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)] text-white'
          : 'border-[var(--color-border)] bg-[var(--color-bg-primary)]'
      }`}
    >
      {checked && <Check className={iconSize} />}
    </button>
  )
}

function countCheckedItems(areas: V5ReviewArea[]): number {
  let count = 0
  for (const area of areas) {
    if (!area._checked) continue
    count++ // area itself
    for (const goal of area.goals) {
      if (!goal._checked) continue
      count++ // goal
      count += goal.tasks.filter((t) => t._checked).length // tasks
    }
  }
  return count
}

function formatRepeatType(type: string): string {
  switch (type) {
    case 'once':
      return '1회'
    case 'daily':
      return '매일'
    case 'weekdays':
      return '평일'
    case 'weekends':
      return '주말'
    case 'weekly':
      return '매주'
    default:
      return type
  }
}
