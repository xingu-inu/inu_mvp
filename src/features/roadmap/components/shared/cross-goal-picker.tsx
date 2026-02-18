'use client'

import { useEffect, useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { Chip } from '@/components/ui/chip'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import type { Area, Goal } from '@/types/entities'

interface CrossGoalPickerProps {
  primaryGoalId: string | null
  selectedGoalIds: string[]
  onChange: (ids: string[]) => void
  /** Only show goals from these areas. If empty, picker is hidden. */
  filterByAreaIds?: string[]
}

interface GoalsByArea {
  area: Area
  goals: Goal[]
}

export function CrossGoalPicker({
  primaryGoalId,
  selectedGoalIds,
  onChange,
  filterByAreaIds,
}: CrossGoalPickerProps) {
  const { data: goals = [] } = useGoals()
  const { data: areas = [] } = useAreas()

  const groupedGoals: GoalsByArea[] = useMemo(() => {
    // Filter out primary goal and only include active/maintenance goals
    const eligibleGoals = goals.filter(
      (g) =>
        g.id !== primaryGoalId &&
        (g.status === 'active' || g.status === 'maintenance') &&
        (!filterByAreaIds || filterByAreaIds.includes(g.area_id))
    )

    // Group by area
    const grouped = new Map<string, Goal[]>()
    for (const goal of eligibleGoals) {
      const existing = grouped.get(goal.area_id) ?? []
      existing.push(goal)
      grouped.set(goal.area_id, existing)
    }

    // Build result with area info
    const result: GoalsByArea[] = []
    for (const area of areas) {
      const areaGoals = grouped.get(area.id)
      if (areaGoals && areaGoals.length > 0) {
        result.push({ area, goals: areaGoals })
      }
    }

    return result
  }, [goals, areas, primaryGoalId, filterByAreaIds])

  // Auto-clean selected goals when their area is deselected
  const eligibleGoalIds = useMemo(
    () => new Set(groupedGoals.flatMap(({ goals: gs }) => gs.map((g) => g.id))),
    [groupedGoals]
  )

  useEffect(() => {
    if (selectedGoalIds.length === 0) return
    const cleaned = selectedGoalIds.filter((id) => eligibleGoalIds.has(id))
    if (cleaned.length !== selectedGoalIds.length) {
      onChange(cleaned)
    }
  }, [eligibleGoalIds, selectedGoalIds, onChange])

  const toggleGoal = (goalId: string) => {
    onChange(
      selectedGoalIds.includes(goalId)
        ? selectedGoalIds.filter((id) => id !== goalId)
        : [...selectedGoalIds, goalId]
    )
  }

  if (groupedGoals.length === 0) return null

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">연결할 목표 (선택)</Label>
      <div className="space-y-2">
        {groupedGoals.map(({ area, goals: areaGoals }) => (
          <div key={area.id} className="space-y-1">
            <span className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
              {area.emoji} {area.name}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {areaGoals.map((goal) => (
                <Chip
                  key={goal.id}
                  variant="selection"
                  selected={selectedGoalIds.includes(goal.id)}
                  onClick={() => toggleGoal(goal.id)}
                  className="cursor-pointer text-xs"
                >
                  {goal.name}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
