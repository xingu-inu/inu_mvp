import { useMemo } from 'react'
import { useGoals } from '@/queries/use-goals'
import type { Task } from '@/types/entities'

export interface CrossLinkedTask {
  id: string
  name: string
  goalId: string
  goalName: string
  areaId: string
  areaName: string
  areaEmoji: string
  areaColor: string
  /** Full related_goal_ids from the task, needed for unlink operations */
  relatedGoalIds: string[]
}

export interface CrossLinkedTaskWithMeta {
  task: Task
  sourceGoalId: string
  sourceGoalName: string
  sourceAreaEmoji: string
  sourceAreaColor: string
}

/**
 * Derive cross-linked tasks for a given goalId from the existing goals cache.
 * Returns tasks from OTHER goals that have `goalId` in their `related_goal_ids`.
 */
export function useCrossLinkedTasks(goalId: string | null | undefined) {
  const { data: goals, isLoading } = useGoals()

  const crossLinkedTasksRich = useMemo<CrossLinkedTaskWithMeta[]>(() => {
    if (!goalId || !goals) return []

    const result: CrossLinkedTaskWithMeta[] = []

    for (const goal of goals) {
      // Skip the current goal itself
      if (goal.id === goalId) continue

      const tasks = goal.tasks ?? []
      for (const task of tasks) {
        if (task.related_goal_ids?.includes(goalId)) {
          result.push({
            task,
            sourceGoalId: goal.id,
            sourceGoalName: goal.name,
            sourceAreaEmoji: goal.area?.emoji ?? '',
            sourceAreaColor: goal.area?.color ?? '',
          })
        }
      }
    }

    return result
  }, [goalId, goals])

  // Backward-compatible flat list
  const crossLinkedTasks = useMemo<CrossLinkedTask[]>(
    () =>
      crossLinkedTasksRich.map(
        ({ task, sourceGoalId, sourceGoalName, sourceAreaEmoji, sourceAreaColor }) => ({
          id: task.id,
          name: task.name,
          goalId: sourceGoalId,
          goalName: sourceGoalName,
          areaId: '',
          areaName: '',
          areaEmoji: sourceAreaEmoji,
          areaColor: sourceAreaColor,
          relatedGoalIds: task.related_goal_ids ?? [],
        })
      ),
    [crossLinkedTasksRich]
  )

  const crossLinkedByGroup = useMemo(() => {
    const map = new Map<string | null, CrossLinkedTaskWithMeta[]>()
    for (const item of crossLinkedTasksRich) {
      const targetGroupId = item.task.cross_link_group_map?.[goalId!] ?? null
      const existing = map.get(targetGroupId) ?? []
      existing.push(item)
      map.set(targetGroupId, existing)
    }
    return map
  }, [crossLinkedTasksRich, goalId])

  return { crossLinkedTasks, crossLinkedTasksRich, crossLinkedByGroup, isLoading }
}
