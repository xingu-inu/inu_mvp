'use client'

import { useState } from 'react'
import { Check, Loader2, ChevronDown, ChevronRight, X } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { queryKeys } from '@/lib/query/keys'
import { createTask as createTaskAction } from '@/actions'
import { validateAiIds } from '@/lib/utils/validate-ai-ids'
import { sanitizeAiTask } from '@/lib/utils/sanitize-ai-task'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import type { AiTaskSuggestResponse } from '@/lib/ai/types'

interface AiTaskSuggestPreviewProps {
  data: AiTaskSuggestResponse
  selectedDate: Date
  onComplete: () => void
  onCancel: () => void
}

export function AiTaskSuggestPreview({
  data,
  selectedDate,
  onComplete: _onComplete,
  onCancel,
}: AiTaskSuggestPreviewProps) {
  // _onComplete is kept for interface compatibility; preview stays visible after apply
  void _onComplete
  const queryClient = useQueryClient()
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: cachedGoals = [] } = useGoals()
  const { data: cachedAreas = [] } = useAreas()

  const { summary, suggestions } = data

  const [selectedGoalGroups, setSelectedGoalGroups] = useState<Set<number>>(
    new Set(suggestions.map((_, i) => i))
  )
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(
    new Set(suggestions.flatMap((group, gi) => group.tasks.map((_, ti) => `${gi}-${ti}`)))
  )
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(
    new Set(suggestions.map((_, i) => i))
  )
  const [isCreating, setIsCreating] = useState(false)
  const [isApplied, setIsApplied] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const toggleGoalGroup = (index: number) => {
    const next = new Set(selectedGoalGroups)
    if (next.has(index)) {
      next.delete(index)
      // Deselect all tasks of this goal group
      const group = suggestions[index]
      const nextTasks = new Set(selectedTasks)
      group.tasks.forEach((_, ti) => {
        nextTasks.delete(`${index}-${ti}`)
      })
      setSelectedTasks(nextTasks)
    } else {
      next.add(index)
      // Select all tasks of this goal group
      const group = suggestions[index]
      const nextTasks = new Set(selectedTasks)
      group.tasks.forEach((_, ti) => {
        nextTasks.add(`${index}-${ti}`)
      })
      setSelectedTasks(nextTasks)
    }
    setSelectedGoalGroups(next)
  }

  const toggleTask = (groupIndex: number, taskIndex: number) => {
    const key = `${groupIndex}-${taskIndex}`
    const next = new Set(selectedTasks)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    setSelectedTasks(next)
  }

  const toggleExpand = (index: number) => {
    const next = new Set(expandedGroups)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    setExpandedGroups(next)
  }

  const handleApply = async () => {
    setIsCreating(true)

    // Count total selected tasks
    let total = 0
    suggestions.forEach((group, gi) => {
      group.tasks.forEach((_, ti) => {
        if (selectedTasks.has(`${gi}-${ti}`)) total++
      })
    })
    setProgress({ current: 0, total })

    let current = 0
    let failedCount = 0

    for (let gi = 0; gi < suggestions.length; gi++) {
      const goalGroup = suggestions[gi]

      for (let ti = 0; ti < goalGroup.tasks.length; ti++) {
        if (!selectedTasks.has(`${gi}-${ti}`)) continue
        const task = goalGroup.tasks[ti]

        try {
          const { goalId, areaId } = validateAiIds(
            { goalId: goalGroup.goalId, areaId: goalGroup.areaId },
            cachedGoals,
            cachedAreas
          )

          // Fallback: derive areaId from the validated goal
          let finalAreaId = areaId
          if (!finalAreaId && goalId) {
            const goal = cachedGoals.find((g) => g.id === goalId)
            if (goal) finalAreaId = goal.area_id
          }

          const sanitized = sanitizeAiTask(task, dateStr)

          // Call server action directly (not via mutation hook)
          // to avoid TanStack Query mutate-in-loop callback issues
          const input = {
            goal_id: goalId,
            area_id: finalAreaId,
            ...sanitized,
          }
          console.log('[ai-task-suggest] Creating task with input:', JSON.stringify(input))
          const response = await createTaskAction(input)

          if (!response.success) {
            console.error('[ai-task-suggest] Server response:', JSON.stringify(response))
            throw new Error(response.error.message)
          }
        } catch (err) {
          failedCount++
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[ai-task-suggest] Failed to create task:', task.name, msg)
        }
        current++
        setProgress({ current, total })
      }
    }

    // Invalidate caches once after batch creation
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home })
    queryClient.invalidateQueries({ queryKey: ['tasks', 'home'] })

    setIsCreating(false)

    if (failedCount === total) {
      toast.error('할 일 추가에 실패했습니다. 다시 시도해주세요.')
    } else if (failedCount > 0) {
      toast.warning(`${total - failedCount}개 추가, ${failedCount}개 실패`)
      setIsApplied(true)
    } else {
      toast.success(`${total}개 할 일이 추가되었습니다.`)
      setIsApplied(true)
    }
  }

  const selectedCount = Array.from(selectedTasks).filter((key) => {
    const gi = parseInt(key.split('-')[0])
    return selectedGoalGroups.has(gi) || selectedTasks.has(key)
  }).length

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-3 rounded-2xl bg-[var(--color-bg-secondary)] p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">AI 할일 추천</p>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Summary */}
      {summary && <p className="text-xs text-[var(--color-text-tertiary)]">{summary}</p>}

      <div className="space-y-2">
        {suggestions.map((goalGroup, gi) => (
          <div key={gi} className="space-y-1">
            {/* Goal Group Row */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleGoalGroup(gi)}
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
                  selectedGoalGroups.has(gi)
                    ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)] text-white'
                    : 'border-[var(--color-border)]'
                )}
              >
                {selectedGoalGroups.has(gi) && <Check className="h-3 w-3" />}
              </button>
              <button
                type="button"
                onClick={() => toggleExpand(gi)}
                className="flex flex-1 items-center gap-1 text-left text-sm font-medium"
              >
                {expandedGroups.has(gi) ? (
                  <ChevronDown className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                )}
                <span>
                  {goalGroup.areaEmoji} {goalGroup.goalName}
                </span>
              </button>
            </div>

            {/* Tasks */}
            <AnimatePresence>
              {expandedGroups.has(gi) && goalGroup.tasks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-8 space-y-1"
                >
                  {goalGroup.tasks.map((task, ti) => (
                    <div key={ti} className="flex items-start gap-2 py-1">
                      <button
                        type="button"
                        onClick={() => toggleTask(gi, ti)}
                        className={cn(
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all',
                          selectedTasks.has(`${gi}-${ti}`)
                            ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-400)] text-white'
                            : 'border-[var(--color-border)]'
                        )}
                      >
                        {selectedTasks.has(`${gi}-${ti}`) && <Check className="h-2.5 w-2.5" />}
                      </button>
                      <div className="flex-1">
                        <span className="text-sm text-[var(--color-text-secondary)]">
                          {task.name}
                        </span>
                        {task.why && (
                          <p className="text-xs text-[var(--color-text-tertiary)]">{task.why}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Progress */}
      {isCreating && (
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            추가 중... ({progress.current}/{progress.total})
          </span>
        </div>
      )}

      {/* Actions */}
      {isApplied ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-done)]">
            <Check className="h-4 w-4" />
            <span>추가 완료</span>
          </div>
          <Button type="button" variant="secondary" size="sm" className="w-full" onClick={onCancel}>
            닫기
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={onCancel}
            disabled={isCreating}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={handleApply}
            disabled={isCreating || selectedCount === 0}
            isLoading={isCreating}
          >
            선택 항목 추가 ({selectedCount})
          </Button>
        </div>
      )}
    </motion.div>
  )
}
