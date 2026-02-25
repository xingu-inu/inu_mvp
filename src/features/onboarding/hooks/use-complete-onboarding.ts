'use client'

import { useState, useCallback } from 'react'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { completeOnboardingV2 } from '@/actions/onboarding.actions'
import type {
  DirectionInput,
  AreaInput,
  GoalInputV2,
  TaskInputV2,
} from '@/actions/onboarding.actions'
import type { AreaType } from '@/types/entities'
import { isApiError } from '@/types/api'

export function useCompleteOnboarding() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    generatedDirection,
    directionMode,
    editedDirection,
    setNavigating,
    organizedGoals,
    activeGoalIds,
    suggestedTasks,
    derivedAreas,
  } = useOnboardingStore()

  const complete = useCallback(async () => {
    if (isPending) return

    setIsPending(true)
    setError(null)

    try {
      // Build direction input
      let directionStatement: string
      if (directionMode === 'edit' && editedDirection) {
        directionStatement = editedDirection
      } else if (directionMode === 'explore') {
        directionStatement = '탐색 중...'
      } else {
        directionStatement = generatedDirection || '나의 인생 방향'
      }

      const direction: DirectionInput = {
        statement: directionStatement,
      }

      const areas: AreaInput[] = derivedAreas.map((area, index) => ({
        name: area.name,
        type: area.type,
        emoji: area.emoji,
        color: area.color,
        sortOrder: `a${index}`,
      }))

      const goals: GoalInputV2[] = organizedGoals.map((g) => ({
        name: g.name,
        areaType: (g.userOverriddenArea || g.areaType) as AreaType,
        status: activeGoalIds.includes(g.id) ? ('active' as const) : ('backlog' as const),
      }))

      const tasks: TaskInputV2[] = suggestedTasks
        .filter((t) => t.accepted)
        .map((t) => {
          const goal = organizedGoals.find((g) => g.id === t.goalId)
          return { name: t.name, goalName: goal?.name || '' }
        })

      const result = await completeOnboardingV2(direction, areas, goals, tasks)
      if (isApiError(result as never)) {
        throw new Error((result as unknown as { error: { message: string } }).error.message)
      }

      trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, {
        areas_count: areas.length,
        goals_count: goals.length,
        tasks_count: tasks.length,
        direction_mode: directionMode,
      })

      // Show transition loading screen before navigation
      setNavigating(true)

      // Full page redirect to ensure proxy runs fresh (avoids client-side routing issues)
      // localStorage cleanup happens in (main)/layout.tsx
      window.location.href = '/roadmap'
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '온보딩 완료에 실패했습니다. 다시 시도해주세요.'
      )
    } finally {
      setIsPending(false)
    }
  }, [
    isPending,
    generatedDirection,
    directionMode,
    editedDirection,
    setNavigating,
    organizedGoals,
    activeGoalIds,
    suggestedTasks,
    derivedAreas,
  ])

  return { complete, isPending, error }
}
