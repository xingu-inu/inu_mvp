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

type Step = 'area' | 'goal' | 'group'

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

  const [step, setStep] = useState<Step>('area')
  const [selectedArea, setSelectedArea] = useState<Area | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)

  // Eligible goals: active/maintenance, excluding current goal
  const eligibleGoals = useMemo(
    () =>
      goals.filter(
        (g) => g.id !== currentGoalId && (g.status === 'active' || g.status === 'maintenance')
      ),
    [goals, currentGoalId]
  )

  // All areas sorted by sort_order (show all, even without eligible goals)
  const sortedAreas = useMemo(
    () => [...areas].sort((a, b) => a.sort_order.localeCompare(b.sort_order)),
    [areas]
  )

  // Goals for selected area
  const goalsForArea = useMemo(() => {
    if (!selectedArea) return []
    return eligibleGoals.filter((g) => g.area_id === selectedArea.id)
  }, [eligibleGoals, selectedArea])

  // Active groups for selected goal
  const activeGroups: Group[] = useMemo(() => {
    if (!selectedGoal) return []
    return (selectedGoal.groups ?? [])
      .filter((g) => !g.is_completed)
      .sort((a, b) => a.sort_order.localeCompare(b.sort_order))
  }, [selectedGoal])

  // Goal count per area (for display)
  const goalCountByArea = useMemo(() => {
    const map = new Map<string, number>()
    for (const g of eligibleGoals) {
      map.set(g.area_id, (map.get(g.area_id) ?? 0) + 1)
    }
    return map
  }, [eligibleGoals])

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

  const handleAreaClick = (area: Area) => {
    setSelectedArea(area)
    setStep('goal')
  }

  const handleGoalClick = (targetGoal: Goal) => {
    const hasActiveGroups = (targetGoal.groups ?? []).some((g) => !g.is_completed)

    if (hasActiveGroups) {
      setSelectedGoal(targetGoal)
      setStep('group')
    } else {
      executeMoveTask(targetGoal.id, null)
    }
  }

  const handleGroupClick = (groupId: string | null) => {
    if (!selectedGoal) return
    executeMoveTask(selectedGoal.id, groupId)
  }

  const handleBack = () => {
    if (step === 'group') {
      setSelectedGoal(null)
      setStep('goal')
    } else if (step === 'goal') {
      setSelectedArea(null)
      setStep('area')
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep('area')
      setSelectedArea(null)
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
          {step === 'area' && (
            <>
              <p className="text-xs font-medium text-[var(--color-text-primary)]">이동</p>
              <div className="max-h-60 space-y-0.5 overflow-y-auto">
                {sortedAreas.length === 0 ? (
                  <p className="py-2 text-center text-xs text-[var(--color-text-tertiary)]">
                    영역이 없어요
                  </p>
                ) : (
                  sortedAreas.map((area) => {
                    const count = goalCountByArea.get(area.id) ?? 0
                    return (
                      <button
                        key={area.id}
                        className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                        onClick={() => handleAreaClick(area)}
                      >
                        <span>
                          {area.emoji} {area.name}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">
                          {count}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </>
          )}

          {step === 'goal' && selectedArea && (
            <>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleBack}
                  className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <ArrowLeft className="size-3.5" />
                </button>
                <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">
                  {selectedArea.emoji} {selectedArea.name}
                </p>
              </div>
              <div className="max-h-60 space-y-0.5 overflow-y-auto">
                {goalsForArea.length === 0 ? (
                  <p className="py-2 text-center text-xs text-[var(--color-text-tertiary)]">
                    이동할 수 있는 목표가 없어요
                  </p>
                ) : (
                  goalsForArea.map((goal) => (
                    <button
                      key={goal.id}
                      className="w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
                      onClick={() => handleGoalClick(goal)}
                    >
                      {goal.name}
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {step === 'group' && selectedGoal && (
            <>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleBack}
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
