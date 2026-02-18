'use client'

import { useState } from 'react'
import { Check, Loader2, ChevronDown, ChevronRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCreateGroup } from '@/queries/use-groups'
import { useCreateTask } from '@/queries/use-tasks'
import type { AiDecomposeGroup } from '@/lib/ai/types'
import type { RepeatType, TimeSlot } from '@/types/entities'

interface AiDecomposePreviewProps {
  goalId: string
  groups: AiDecomposeGroup[]
  onComplete: () => void
  onCancel: () => void
}

export function AiDecomposePreview({
  goalId,
  groups,
  onComplete: _onComplete,
  onCancel,
}: AiDecomposePreviewProps) {
  // _onComplete is kept for interface compatibility; preview now stays visible after apply
  void _onComplete
  const createGroup = useCreateGroup()
  const createTask = useCreateTask()

  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(
    new Set(groups.map((_, i) => i))
  )
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(
    new Set(groups.flatMap((group, gi) => (group.tasks || []).map((_, ti) => `${gi}-${ti}`)))
  )
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(
    new Set(groups.map((_, i) => i))
  )
  const [isCreating, setIsCreating] = useState(false)
  const [isApplied, setIsApplied] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const toggleGroup = (index: number) => {
    const next = new Set(selectedGroups)
    if (next.has(index)) {
      next.delete(index)
      // Deselect all tasks of this group
      const group = groups[index]
      ;(group.tasks || []).forEach((_, ti) => {
        selectedTasks.delete(`${index}-${ti}`)
      })
      setSelectedTasks(new Set(selectedTasks))
    } else {
      next.add(index)
      // Select all tasks of this group
      const group = groups[index]
      const nextTasks = new Set(selectedTasks)
      ;(group.tasks || []).forEach((_, ti) => {
        nextTasks.add(`${index}-${ti}`)
      })
      setSelectedTasks(nextTasks)
    }
    setSelectedGroups(next)
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

    // Count total items
    let total = 0
    groups.forEach((group, gi) => {
      if (selectedGroups.has(gi)) total++
      ;(group.tasks || []).forEach((_, ti) => {
        if (selectedTasks.has(`${gi}-${ti}`)) total++
      })
    })
    setProgress({ current: 0, total })

    let current = 0

    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi]
      if (!selectedGroups.has(gi)) continue

      // Create group
      try {
        const createdGroup = await new Promise<{ id: string; goal_id: string }>(
          (resolve, reject) => {
            createGroup.mutate(
              { goal_id: goalId, name: group.name, description: group.description },
              {
                onSuccess: (data) => resolve(data),
                onError: (err) => reject(err),
              }
            )
          }
        )
        current++
        setProgress({ current, total })

        // Create tasks for this group
        const tasks = group.tasks || []
        for (let ti = 0; ti < tasks.length; ti++) {
          if (!selectedTasks.has(`${gi}-${ti}`)) continue
          const task = tasks[ti]

          await new Promise<void>((resolve, reject) => {
            createTask.mutate(
              {
                goal_id: goalId,
                group_id: createdGroup.id,
                name: task.name,
                why: task.why,
                repeat_type: (task.repeat_type as RepeatType) || 'daily',
                duration_minutes: task.duration_minutes || 15,
                time_slot: (task.time_slot as TimeSlot) || 'anytime',
              },
              {
                onSuccess: () => resolve(),
                onError: (err) => reject(err),
              }
            )
          })
          current++
          setProgress({ current, total })
        }
      } catch {
        // Continue with next group on error
        current++
        setProgress({ current, total })
      }
    }

    setIsCreating(false)
    setIsApplied(true)
  }

  const selectedCount =
    selectedGroups.size +
    Array.from(selectedTasks).filter((key) => {
      const gi = parseInt(key.split('-')[0])
      return selectedGroups.has(gi)
    }).length

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-3 rounded-2xl bg-[var(--color-bg-secondary)] p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">AI가 제안한 구성</p>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {groups.map((group, gi) => (
          <div key={gi} className="space-y-1">
            {/* Group Row */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleGroup(gi)}
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
                  selectedGroups.has(gi)
                    ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)] text-white'
                    : 'border-[var(--color-border)]'
                )}
              >
                {selectedGroups.has(gi) && <Check className="h-3 w-3" />}
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
                  {gi + 1}. {group.name}
                </span>
              </button>
            </div>
            {group.description && expandedGroups.has(gi) && (
              <p className="ml-11 text-xs text-[var(--color-text-tertiary)]">{group.description}</p>
            )}

            {/* Tasks */}
            <AnimatePresence>
              {expandedGroups.has(gi) && (group.tasks || []).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-8 space-y-1"
                >
                  {(group.tasks || []).map((task, ti) => (
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
