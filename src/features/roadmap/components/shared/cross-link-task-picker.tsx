'use client'

import { useState, useMemo } from 'react'
import { ResponsiveModal, ModalBody, ModalFooter } from '@/components/ui/responsive-modal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { cn } from '@/lib/utils'
import type { Area, Goal, Task } from '@/types/entities'

interface CrossLinkTaskPickerProps {
  currentGoalId: string
  groups?: Array<{ id: string; name: string }>
  onLink: (taskIds: string[], targetGroupId: string | null) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface TasksByGoalByArea {
  area: Area
  goals: Array<{
    goal: Goal
    tasks: Task[]
  }>
}

export function CrossLinkTaskPicker({
  currentGoalId,
  groups,
  onLink,
  open,
  onOpenChange,
}: CrossLinkTaskPickerProps) {
  const { data: goals = [] } = useGoals()
  const { data: areas = [] } = useAreas()
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    groups && groups.length > 0 ? groups[0].id : null
  )

  const groupedTasks: TasksByGoalByArea[] = useMemo(() => {
    // Get goals with active tasks, excluding current goal
    const otherGoals = goals.filter(
      (g) =>
        g.id !== currentGoalId &&
        (g.status === 'active' || g.status === 'maintenance') &&
        g.tasks &&
        g.tasks.length > 0
    )

    // Group by area
    const areaMap = new Map<string, Array<{ goal: Goal; tasks: Task[] }>>()
    for (const goal of otherGoals) {
      const activeTasks = (goal.tasks ?? []).filter((t) => t.status === 'active')
      if (activeTasks.length === 0) continue

      const existing = areaMap.get(goal.area_id) ?? []
      existing.push({ goal, tasks: activeTasks })
      areaMap.set(goal.area_id, existing)
    }

    // Build ordered result
    const result: TasksByGoalByArea[] = []
    for (const area of areas) {
      const areaGoals = areaMap.get(area.id)
      if (areaGoals && areaGoals.length > 0) {
        result.push({ area, goals: areaGoals })
      }
    }

    return result
  }, [goals, areas, currentGoalId])

  const toggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    )
  }

  const handleConfirm = () => {
    if (selectedTaskIds.length > 0) {
      onLink(selectedTaskIds, selectedGroupId)
      setSelectedTaskIds([])
      setSelectedGroupId(null)
      onOpenChange(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedTaskIds([])
      setSelectedGroupId(groups && groups.length > 0 ? groups[0].id : null)
    }
    onOpenChange(nextOpen)
  }

  const isEmpty = groupedTasks.length === 0

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleOpenChange}
      title="다른 목표의 할 일 연결"
      description="이 목표와 관련된 할 일을 선택하세요"
    >
      <ModalBody>
        {isEmpty ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="text-3xl">🔗</span>
            <p className="text-sm text-[var(--color-text-secondary)]">
              연결할 수 있는 할 일이 없어요
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              다른 목표에 활성 할 일을 먼저 추가해 보세요
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedTasks.map(({ area, goals: areaGoals }) => (
              <div key={area.id} className="space-y-2">
                {/* Area header */}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{area.emoji}</span>
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                    {area.name}
                  </span>
                </div>

                {/* Goals within area */}
                {areaGoals.map(({ goal, tasks }) => (
                  <div key={goal.id} className="ml-2 space-y-1.5">
                    {/* Goal subheader */}
                    <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                      {goal.name}
                    </span>

                    {/* Tasks */}
                    {tasks.map((task) => (
                      <label
                        key={task.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--color-bg-secondary)]"
                      >
                        <Checkbox
                          checked={selectedTaskIds.includes(task.id)}
                          onCheckedChange={() => toggleTask(task.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-[var(--color-text-primary)]">
                            {task.name}
                          </span>
                          {task.why && (
                            <p className="truncate text-[10px] text-[var(--color-text-tertiary)]">
                              {task.why}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </ModalBody>

      {/* Group Selection - only when groups exist and tasks are selected */}
      {groups && groups.length > 0 && selectedTaskIds.length > 0 && (
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          <p className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">배치할 그룹</p>
          <div className="flex flex-wrap gap-1.5">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroupId(group.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs transition-colors',
                  selectedGroupId === group.id
                    ? 'bg-[var(--color-primary-500)] text-white'
                    : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                )}
              >
                {group.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isEmpty && (
        <ModalFooter>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => handleOpenChange(false)}
          >
            취소
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={handleConfirm}
            disabled={selectedTaskIds.length === 0}
          >
            연결하기 {selectedTaskIds.length > 0 && `(${selectedTaskIds.length})`}
          </Button>
        </ModalFooter>
      )}
    </ResponsiveModal>
  )
}
