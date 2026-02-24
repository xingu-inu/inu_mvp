'use client'

import { useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  closestCorners,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AreaTaskSection } from './area-task-section'
import { CompactTaskRow } from './compact-task-row'
import { DailySection } from './daily-section'
import { GoalPickerPopover } from './goal-picker-popover'
import { DragOverlayCard } from '@/components/common'
import { useStandardSensors, DROP_ANIMATION } from '@/lib/dnd/dnd-config'
import { useAreaDnd } from '../hooks/use-area-dnd'
import { useTaskDnd } from '../hooks/use-task-dnd'
import type { HomeTask } from '@/types/entities'
import type { AreaGroup } from '@/lib/utils/task-utils'

/**
 * Custom collision detection — filters droppables by active drag type:
 *  - Area drags: only consider area droppables (closestCenter)
 *  - Task drags: exclude area droppables, keep task/container (closestCorners)
 *
 * This prevents area and task droppables from interfering with each other's
 * collision detection, which was the root cause of the original DnD bugs.
 */
const homeCollisionDetection: CollisionDetection = (args) => {
  const activeData = args.active.data.current as { type?: string } | undefined

  if (activeData?.type === 'area') {
    const areaDroppables = args.droppableContainers.filter(
      (c) => (c.data.current as Record<string, unknown> | undefined)?.type === 'area'
    )
    return closestCenter({ ...args, droppableContainers: areaDroppables })
  }

  // Task drag — exclude area sortable droppables
  const taskDroppables = args.droppableContainers.filter(
    (c) => (c.data.current as Record<string, unknown> | undefined)?.type !== 'area'
  )
  return closestCorners({ ...args, droppableContainers: taskDroppables })
}

interface SortableTaskListProps {
  areaGroups: AreaGroup[]
  dailyTasks: HomeTask[]
  isReadOnly: boolean
  selectedDate: Date
  expandedTaskId?: string | null
  onToggle?: (taskId: string) => void
  onDragStart?: () => void
  enableAiSuggest?: boolean
  priorityTiers?: Record<string, number> | null
}

export function SortableTaskList({
  areaGroups,
  dailyTasks,
  isReadOnly,
  selectedDate,
  expandedTaskId,
  onToggle,
  onDragStart: onDragStartProp,
  enableAiSuggest,
  priorityTiers,
}: SortableTaskListProps) {
  // ── Area DnD ──
  const { areaOrder, onAreaDragEnd, onAreaDragCancel } = useAreaDnd(areaGroups, selectedDate)

  // ── Task DnD ──
  const {
    activeTaskId,
    pendingCrossMove,
    overContainerId,
    taskContainers,
    tasksById,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
    confirmCrossMove,
    cancelCrossMove,
  } = useTaskDnd(areaGroups, dailyTasks, selectedDate)

  const sensors = useStandardSensors()

  // ── Dispatch handlers by drag type ──

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      onDragStartProp?.()
      const activeData = event.active.data.current as { type?: string } | undefined
      if (activeData?.type !== 'area') {
        onDragStart(event)
      }
    },
    [onDragStartProp, onDragStart]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const activeData = event.active.data.current as { type?: string } | undefined
      if (activeData?.type === 'area') return
      onDragOver(event)
    },
    [onDragOver]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeData = event.active.data.current as { type?: string } | undefined
      if (activeData?.type === 'area') {
        onAreaDragEnd(event)
        return
      }
      onDragEnd(event)
    },
    [onAreaDragEnd, onDragEnd]
  )

  const handleDragCancel = useCallback(() => {
    // Clean up both area and task state — safe to call both since they're no-ops if inactive
    onAreaDragCancel()
    onDragCancel()
  }, [onAreaDragCancel, onDragCancel])

  // Area sortable IDs (prefixed to avoid collision with container droppable IDs)
  const areaSortableIds = areaOrder.map((id) => `area-${id}`)

  // Active dragged task (for DragOverlay)
  const activeTask = activeTaskId ? (tasksById.get(activeTaskId) ?? null) : null

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={homeCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={areaSortableIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {areaOrder.map((areaId) => {
              const group = areaGroups.find((g) => g.area.id === areaId)
              if (!group) return null

              const taskIds = taskContainers[areaId] ?? []
              const tasks = taskIds.map((id) => tasksById.get(id)).filter(Boolean) as HomeTask[]

              return (
                <AreaTaskSection
                  key={areaId}
                  sortable
                  area={group.area}
                  goals={group.goals}
                  tasks={tasks}
                  stats={group.stats}
                  isReadOnly={isReadOnly}
                  selectedDate={selectedDate}
                  expandedTaskId={expandedTaskId}
                  onToggle={onToggle}
                  enableAiSuggest={enableAiSuggest}
                  priorityTiers={priorityTiers}
                  isOver={overContainerId === areaId}
                />
              )
            })}

            <DailySection
              sortable
              taskIds={taskContainers['daily'] ?? []}
              tasksById={tasksById}
              isReadOnly={isReadOnly}
              selectedDate={selectedDate}
              expandedTaskId={expandedTaskId}
              onToggle={onToggle}
              enableAiSuggest={enableAiSuggest}
              priorityTiers={priorityTiers}
              isOver={overContainerId === 'daily'}
            />
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={DROP_ANIMATION}>
          {activeTask ? (
            <DragOverlayCard>
              <CompactTaskRow task={activeTask} isReadOnly selectedDate={selectedDate} />
            </DragOverlayCard>
          ) : null}
        </DragOverlay>
      </DndContext>

      {pendingCrossMove && (
        <GoalPickerPopover
          goals={pendingCrossMove.targetGoals}
          onSelect={confirmCrossMove}
          onCancel={cancelCrossMove}
        />
      )}
    </>
  )
}
