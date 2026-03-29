import { useMemo } from 'react'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useTasks } from '@/queries/use-tasks'
import { useDirection } from '@/queries/use-direction'
import type { AiTaskSuggestContext, AiTaskSuggestGoalData } from '@/lib/ai/types'

/**
 * Home AI 할일 추천을 위한 컨텍스트 빌더.
 * 기존 React Query 캐시 데이터에서 AI가 필요한 구조로 변환한다.
 * 데이터가 아직 로드되지 않았으면 null을 반환한다.
 */
export function useTaskSuggestContext(): {
  context: AiTaskSuggestContext | null
  isLoading: boolean
} {
  const { data: direction, isLoading: directionLoading } = useDirection()
  const { data: areas, isLoading: areasLoading } = useAreas()
  const { data: goals, isLoading: goalsLoading } = useGoals()
  const { data: tasks, isLoading: tasksLoading } = useTasks()

  const isLoading = directionLoading || areasLoading || goalsLoading || tasksLoading

  const context = useMemo<AiTaskSuggestContext | null>(() => {
    if (!areas || !goals || !tasks) return null

    // Area lookup map for goal enrichment
    const areaMap = new Map(areas.map((a) => [a.id, a]))

    // Only include goals with status 'active' or 'backlog'
    const filteredGoals: AiTaskSuggestGoalData[] = goals
      .filter((g) => g.status === 'active' || g.status === 'backlog')
      .map((g) => {
        const area = areaMap.get(g.area_id)
        return {
          id: g.id,
          name: g.name,
          areaId: g.area_id,
          areaName: area?.name ?? '',
          areaEmoji: area?.emoji ?? '',
          status: g.status,
          why: g.why,
        }
      })

    return {
      direction: direction?.statement ?? null,
      areas: areas.map((a) => ({
        id: a.id,
        name: a.name,
        emoji: a.emoji,
        type: a.type,
        why: a.why,
      })),
      goals: filteredGoals,
      existingTasks: tasks.map((t) => ({
        name: t.name,
        goalId: t.goal_id,
      })),
    }
  }, [direction, areas, goals, tasks])

  return { context, isLoading }
}
