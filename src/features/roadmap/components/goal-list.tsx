'use client'

import { useCallback } from 'react'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useDirection } from '@/queries/use-direction'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { TreeView } from './tree-view'
import { EmptyRoadmap } from './empty-roadmap'
import { GoalListSkeleton } from './goal-list-skeleton'
import { ErrorCard } from '@/components/ui/error-card'

interface GoalListProps {
  isMobile?: boolean
}

export function GoalList({ isMobile = false }: GoalListProps) {
  const select = useRoadmapStore((s) => s.select)
  const setPanelMode = useRoadmapStore((s) => s.setPanelMode)

  const handleGoalSelect = useCallback(
    (goalId: string | null) => {
      if (goalId) {
        select({ type: 'goal', id: goalId })
      } else {
        useRoadmapStore.getState().clearSelection()
      }
    },
    [select]
  )

  // Fetch data - always fetch all goals for tree view
  const { data: direction } = useDirection()
  const {
    data: goals = [],
    isLoading: goalsLoading,
    isError: goalsError,
    error: goalsErr,
    refetch: refetchGoals,
  } = useGoals()
  const {
    data: areas = [],
    isLoading: areasLoading,
    isError: areasError,
    error: areasErr,
    refetch: refetchAreas,
  } = useAreas()

  if (goalsError || areasError) {
    return (
      <ErrorCard
        error={(goalsErr ?? areasErr) as Error}
        onRetry={() => {
          refetchGoals()
          refetchAreas()
        }}
      />
    )
  }

  const isLoading = goalsLoading || areasLoading

  if (isLoading) {
    return <GoalListSkeleton />
  }

  // Filter areas that are active
  const activeAreas = areas.filter((area) => area.is_active)

  const hasAnyGoals = goals.length > 0

  if (!hasAnyGoals) {
    return <EmptyRoadmap onAddGoal={() => setPanelMode('browse')} isMobile={isMobile} />
  }

  // Tree View - 계층 구조 (Direction → Status → Area → Goal → Group → Task)
  return (
    <TreeView
      direction={direction ?? null}
      goals={goals}
      areas={activeAreas}
      onGoalSelect={handleGoalSelect}
      isMobile={isMobile}
    />
  )
}
