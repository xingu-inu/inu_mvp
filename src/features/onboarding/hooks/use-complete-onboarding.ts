'use client'

import { useState, useCallback } from 'react'

import { completeOnboardingV2 } from '@/actions/onboarding.actions'
import type {
  DirectionInput,
  AreaInput,
  GoalInputV2,
  TaskInputV2,
} from '@/actions/onboarding.actions'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { AREA_PRESETS_EXTENDED, DIRECTION_CHIP_OPTIONS } from '@/lib/constants/onboarding'
import { buildSuggestedTaskKey, useOnboardingStore } from '@/stores/onboarding.store'
import { isApiError } from '@/types/api'
import type { AreaType } from '@/types/entities'

export function useCompleteOnboarding() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    flowVersion,
    setNavigating,
    organizedGoals,
    activeGoalIds,
    suggestedTasks,
    derivedAreas,
    primaryTaskId,
    startedAt,
    v5DirectionChips,
    v5ReviewAreas,
  } = useOnboardingStore()

  const complete = useCallback(async () => {
    if (isPending) return

    setIsPending(true)
    setError(null)

    try {
      let direction: DirectionInput
      let areas: AreaInput[]
      let goals: GoalInputV2[]
      let tasks: TaskInputV2[]

      if (flowVersion === 'v5') {
        // V5: build from review areas + direction chips
        const selectedChips = DIRECTION_CHIP_OPTIONS.filter((c) => v5DirectionChips.includes(c.id))
        const directionStatement =
          selectedChips.length > 0
            ? selectedChips.map((c) => c.statement).join(', ') + ' 살고 싶다'
            : '탐색 중인 방향'

        direction = { statement: directionStatement }

        const checkedAreas = v5ReviewAreas.filter((a) => a._checked)

        areas = checkedAreas.map((area, index) => ({
          name: area.name,
          type: area.type as AreaType,
          emoji: area.emoji,
          color: area.color,
          sortOrder: `a${index}`,
        }))

        if (areas.length === 0) {
          areas = [
            {
              name: '기타',
              type: 'custom' as AreaType,
              emoji: '📌',
              color: '#8a7a65',
              sortOrder: 'a0',
            },
          ]
        }

        goals = checkedAreas.flatMap((area) =>
          area.goals
            .filter((g) => g._checked)
            .map((g) => ({
              name: g.name,
              areaType: area.type as AreaType,
              status: 'active' as const,
            }))
        )

        tasks = checkedAreas.flatMap((area) =>
          area.goals
            .filter((g) => g._checked)
            .flatMap((g) =>
              g.tasks.filter((t) => t._checked).map((t) => ({ name: t.name, goalName: g.name }))
            )
        )
      } else {
        // V3 / V4 path (unchanged)
        direction = { statement: '탐색 중인 방향' }

        const areaSource =
          derivedAreas.length > 0
            ? derivedAreas
            : AREA_PRESETS_EXTENDED.filter((area) =>
                organizedGoals.some((goal) => {
                  const goalArea = goal.userOverriddenArea || goal.areaType
                  return goalArea === area.type
                })
              )

        const safeAreaSource =
          areaSource.length > 0
            ? areaSource
            : [{ name: '기타', type: 'custom' as const, emoji: '📌', color: '#8a7a65' }]

        areas = safeAreaSource.map((area, index) => ({
          name: area.name,
          type: area.type,
          emoji: area.emoji,
          color: area.color,
          sortOrder: `a${index}`,
        }))

        goals = organizedGoals.map((goal) => ({
          name: goal.name,
          areaType: (goal.userOverriddenArea || goal.areaType) as AreaType,
          status: activeGoalIds.includes(goal.id) ? 'active' : 'backlog',
        }))

        const acceptedTasks = suggestedTasks.filter((task) => task.accepted)
        const sortedTasks = acceptedTasks.sort((a, b) => {
          const aPrimary = primaryTaskId
            ? buildSuggestedTaskKey(a.goalId, a.name) === primaryTaskId
            : false
          const bPrimary = primaryTaskId
            ? buildSuggestedTaskKey(b.goalId, b.name) === primaryTaskId
            : false
          if (aPrimary === bPrimary) return 0
          return aPrimary ? -1 : 1
        })

        tasks = sortedTasks
          .map((task) => {
            const goal = organizedGoals.find((g) => g.id === task.goalId)
            return { name: task.name, goalName: goal?.name || '' }
          })
          .filter((task) => task.goalName)
      }

      const result = await completeOnboardingV2(direction, areas, goals, tasks)
      if (isApiError(result as never)) {
        throw new Error((result as unknown as { error: { message: string } }).error.message)
      }

      const durationSec = startedAt
        ? Math.max(1, Math.round((Date.now() - startedAt) / 1000))
        : null

      trackEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, {
        flow_version: flowVersion,
        goals_count: goals.filter((g) => g.status === 'active').length,
        tasks_count: tasks.length,
        primary_task_set: Boolean(primaryTaskId),
        duration_sec: durationSec,
      })

      setNavigating(true)
      window.location.href = '/home'
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '온보딩 완료에 실패했습니다. 다시 시도해주세요.'
      )
    } finally {
      setIsPending(false)
    }
  }, [
    isPending,
    flowVersion,
    setNavigating,
    organizedGoals,
    activeGoalIds,
    suggestedTasks,
    derivedAreas,
    primaryTaskId,
    startedAt,
    v5DirectionChips,
    v5ReviewAreas,
  ])

  return { complete, isPending, error }
}
