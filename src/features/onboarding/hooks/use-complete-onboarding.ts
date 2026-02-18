'use client'

import { useState, useCallback } from 'react'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { completeOnboarding } from '@/actions/onboarding.actions'
import type { DirectionInput, AreaInput, GoalInput, TaskInput } from '@/actions/onboarding.actions'

export function useCompleteOnboarding() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    generatedDirection,
    directionMode,
    editedDirection,
    selectedAreas,
    selectedGoalArea,
    firstGoal,
    firstTask,
    setNavigating,
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

      // Build areas input from multi-select (Step 3)
      const areas: AreaInput[] = selectedAreas.map((area, index) => ({
        name: area.name,
        type: area.type,
        emoji: area.emoji,
        color: area.color,
        sortOrder: `a${index}`,
      }))

      // Build goal input (optional)
      let goal: GoalInput | undefined
      if (firstGoal?.name && selectedGoalArea) {
        goal = {
          name: firstGoal.name,
          why: firstGoal.why,
        }
      }

      // Build task input (optional)
      let task: TaskInput | undefined
      if (firstTask?.name) {
        task = { name: firstTask.name }
      }

      // Call server action
      await completeOnboarding(direction, areas, goal, task)

      // Track onboarding completion
      trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, {
        areas_count: areas.length,
        has_goal: !!goal,
        has_task: !!task,
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
    selectedAreas,
    selectedGoalArea,
    firstGoal,
    firstTask,
    setNavigating,
  ])

  return { complete, isPending, error }
}
