'use client'

import { memo, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useMoveTaskToGoal } from '@/features/roadmap/hooks/use-move-task-to-goal'
import type { Area, Goal, Group } from '@/types/entities'

interface TaskMoveGoalPopoverProps {
  taskId: string
  currentGoalId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface GoalsByArea {
  area: Area
  goals: Goal[]
}

export const TaskMoveGoalPopover = memo(function TaskMoveGoalPopover({
  taskId,
  currentGoalId,
  open,
  onOpenChange,
  children,
}: TaskMoveGoalPopoverProps) {
  const { data: goals = [] } = useGoals()
  const { data: areas = [] } = useAreas()
  const moveTask = useMoveTaskToGoal()

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)

  const groupedGoals: GoalsByArea[] = useMemo(() => {
    const eligibleGoals = goals.filter(
      (g) => g.id !== currentGoalId && (g.status === 'active' || g.status === 'maintenance')
    )

    const grouped = new Map<string, Goal[]>()
    for (const goal of eligibleGoals) {
      const existing = grouped.get(goal.area_id) ?? []
      existing.push(goal)
      grouped.set(goal.area_id, existing)
    }

    const result: GoalsByArea[] = []
    for (const area of areas) {
      const areaGoals = grouped.get(area.id)
      if (areaGoals && areaGoals.length > 0) {
        result.push({ area, goals: areaGoals })
      }
    }

    return result
  }, [goals, areas, currentGoalId])

  const activeGroups: Group[] = useMemo(() => {
    if (!selectedGoal) return []
    return (selectedGoal.groups ?? [])
      .filter((g) => !g.is_completed)
      .sort((a, b) => a.sort_order.localeCompare(b.sort_order))
  }, [selectedGoal])

  const executeMoveTask = (targetGoalId: string, targetGroupId: string | null) => {
    const goalName = goals.find((g) => g.id === targetGoalId)?.name ?? ''
    moveTask.mutate(
      { taskId, targetGoalId, targetGroupId },
      {
        onSuccess: () => {
          toast.success(`${goalName}(으)로 이동했어요`)
          onOpenChange(false)
        },
      }
    )
  }

  const handleGoalClick = (targetGoal: Goal) => {
    const hasActiveGroups = (targetGoal.groups ?? []).some((g) => !g.is_completed)

    if (hasActiveGroups) {
      setSelectedGoal(targetGoal)
    } else {
      executeMoveTask(targetGoal.id, null)
    }
  }

  const handleGroupClick = (groupId: string | null) => {
    if (!selectedGoal) return
    executeMoveTask(selectedGoal.id, groupId)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedGoal(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        className="w-64 p-3"
        align="end"
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <div className="space-y-2">
          {selectedGoal === null ? (
            <>
              {/* Step 1: Goal selection */}
              <p className="text-xs font-medium text-[var(--color-text-primary)]">
                다른 목표로 이동
              </p>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {groupedGoals.length === 0 ? (
                  <p className="py-2 text-center text-xs text-[var(--color-text-tertiary)]">
                    이동할 수 있는 목표가 없어요
                  </p>
                ) : (
                  groupedGoals.map(({ area, goals: areaGoals }) => (
                    <div key={area.id} className="space-y-0.5">
                      <span className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
                        {area.emoji} {area.name}
                      </span>
                      <div className="space-y-0.5">
                        {areaGoals.map((goal) => (
                          <button
                            key={goal.id}
                            className="w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                            onClick={() => handleGoalClick(goal)}
                          >
                            {goal.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Group selection */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedGoal(null)}
                  className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <ArrowLeft className="size-3.5" />
                </button>
                <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">
                  {selectedGoal.name}
                </p>
              </div>
              <div className="max-h-60 space-y-0.5 overflow-y-auto">
                <button
                  className="w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                  onClick={() => handleGroupClick(null)}
                >
                  그룹 없이 이동
                </button>
                {activeGroups.map((group) => (
                  <button
                    key={group.id}
                    className="w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                    onClick={() => handleGroupClick(group.id)}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
})
