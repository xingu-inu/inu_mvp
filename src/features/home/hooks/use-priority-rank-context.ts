import { useMemo } from 'react'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useTasks } from '@/queries/use-tasks'
import { useDirection } from '@/queries/use-direction'
import type { AiPriorityRankContext, AiPriorityTaskData } from '@/lib/ai/types'

const MAX_ACTIVE_TASKS = 50

/**
 * Build the AI priority-rank context from existing React Query cached data.
 * Returns `null` while any required data is still loading.
 */
export function usePriorityRankContext(): AiPriorityRankContext | null {
  const { data: direction, isLoading: dirLoading } = useDirection()
  const { data: areas, isLoading: areasLoading } = useAreas()
  const { data: goals, isLoading: goalsLoading } = useGoals()
  const { data: allTasks, isLoading: tasksLoading } = useTasks()

  return useMemo(() => {
    if (dirLoading || areasLoading || goalsLoading || tasksLoading) return null
    if (!areas || !goals || !allTasks) return null

    // Build lookup maps
    const areaMap = new Map(areas.map((a) => [a.id, a]))
    const goalMap = new Map(goals.map((g) => [g.id, g]))

    // Only include tasks belonging to the current roadmap version
    const areaIdSet = new Set(areas.map((a) => a.id))
    const goalIdSet = new Set(goals.map((g) => g.id))

    const activeTasks = allTasks
      .filter((t) => {
        if (t.status !== 'active' || !t.is_active) return false
        if (t.goal_id) return goalIdSet.has(t.goal_id)
        if (t.area_id) return areaIdSet.has(t.area_id)
        return true // daily tasks without goal/area
      })
      .slice(0, MAX_ACTIVE_TASKS)

    const allActiveTasks: AiPriorityTaskData[] = activeTasks.map((task) => {
      const goal = task.goal_id ? goalMap.get(task.goal_id) : null
      const area = goal?.area_id ? areaMap.get(goal.area_id) : null

      return {
        id: task.id,
        name: task.name,
        goalId: task.goal_id,
        goalName: goal?.name ?? null,
        areaEmoji: area?.emoji ?? null,
        timeSlot: task.time_slot,
        durationMinutes: task.duration_minutes,
        repeatType: task.repeat_type,
        streakCount: task.streak_count,
        why: task.why,
      }
    })

    // Build task count per goal
    const goalTaskCountMap = new Map<string, number>()
    for (const task of activeTasks) {
      if (task.goal_id) {
        goalTaskCountMap.set(task.goal_id, (goalTaskCountMap.get(task.goal_id) ?? 0) + 1)
      }
    }

    // Active goals only
    const activeGoals = goals.filter((g) => g.status === 'active')

    return {
      direction: direction?.statement ?? null,
      areas: areas.map((a) => ({
        id: a.id,
        name: a.name,
        emoji: a.emoji,
        why: a.why,
      })),
      goals: activeGoals.map((g) => ({
        id: g.id,
        name: g.name,
        areaId: g.area_id,
        status: g.status,
        why: g.why,
        targetDate: g.target_date,
        taskCount: goalTaskCountMap.get(g.id) ?? 0,
      })),
      allActiveTasks,
    }
  }, [direction, areas, goals, allTasks, dirLoading, areasLoading, goalsLoading, tasksLoading])
}
