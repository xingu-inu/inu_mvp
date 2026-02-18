'use client'

import { useCallback } from 'react'
import { DndContext, DragOverlay, closestCorners, type DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { SortableAreaSection } from './sortable-area-section'
import { SortableTaskRow } from './sortable-task-row'
import { CompactTaskRow } from './compact-task-row'
import { InlineTaskInput } from './inline-task-input'
import { DailySectionHeader } from './daily-section-header'
import { GoalPickerPopover } from './goal-picker-popover'
import { DragOverlayCard } from '@/components/common'
import { useStandardSensors, DROP_ANIMATION } from '@/lib/dnd/dnd-config'
import { useTaskDnd } from '../hooks/use-task-dnd'
import type { HomeTask } from '@/types/entities'
import type { AreaGroup } from '@/lib/utils/task-utils'

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
  const {
    activeItem,
    pendingCrossMove,
    taskContainers,
    areaOrder,
    tasksById,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
    confirmCrossMove,
    cancelCrossMove,
  } = useTaskDnd(areaGroups, dailyTasks, selectedDate)

  const sensors = useStandardSensors()

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      onDragStartProp?.()
      onDragStart(event)
    },
    [onDragStartProp, onDragStart]
  )

  // Build area sortable IDs
  const areaSortableIds = areaOrder.map((id) => `area-${id}`)

  // Active dragged task (for DragOverlay)
  const activeTask = activeItem?.type === 'task' ? (tasksById.get(activeItem.id) ?? null) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {/* Area sections (sortable as containers) */}
      <SortableContext items={areaSortableIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {areaOrder.map((areaId) => {
            const group = areaGroups.find((g) => g.area.id === areaId)
            if (!group) return null

            // Resolve ID-only container to full task objects
            const taskIds = taskContainers[areaId] ?? []
            const tasks = taskIds.map((id) => tasksById.get(id)).filter(Boolean) as HomeTask[]

            return (
              <SortableAreaSection
                key={areaId}
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
              />
            )
          })}

          {/* Daily tasks section (droppable container, not sortable as area) */}
          <DailyDroppableSection
            taskIds={taskContainers['daily'] ?? []}
            tasksById={tasksById}
            isReadOnly={isReadOnly}
            selectedDate={selectedDate}
            expandedTaskId={expandedTaskId}
            onToggle={onToggle}
            enableAiSuggest={enableAiSuggest}
            priorityTiers={priorityTiers}
          />
        </div>
      </SortableContext>

      {/* DragOverlay — renders clone of dragged item outside normal flow */}
      <DragOverlay dropAnimation={DROP_ANIMATION}>
        {activeTask ? (
          <DragOverlayCard>
            <CompactTaskRow task={activeTask} isReadOnly selectedDate={selectedDate} />
          </DragOverlayCard>
        ) : null}
      </DragOverlay>

      {/* Goal picker popover for cross-area moves */}
      {pendingCrossMove && (
        <GoalPickerPopover
          goals={pendingCrossMove.targetGoals}
          onSelect={confirmCrossMove}
          onCancel={cancelCrossMove}
        />
      )}
    </DndContext>
  )
}

/** Daily tasks droppable section */
function DailyDroppableSection({
  taskIds,
  tasksById,
  isReadOnly,
  selectedDate,
  expandedTaskId,
  onToggle,
  enableAiSuggest,
  priorityTiers,
}: {
  taskIds: string[]
  tasksById: Map<string, HomeTask>
  isReadOnly: boolean
  selectedDate: Date
  expandedTaskId?: string | null
  onToggle?: (taskId: string) => void
  enableAiSuggest?: boolean
  priorityTiers?: Record<string, number> | null
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'container-daily',
    data: { type: 'container' as const, containerId: 'daily' },
  })

  const tasks = taskIds.map((id) => tasksById.get(id)).filter(Boolean) as HomeTask[]

  return (
    <section
      ref={setNodeRef}
      aria-labelledby="daily-tasks"
      className="border-l-2 pl-3 transition-colors"
      style={{
        borderLeftColor: 'var(--color-text-tertiary)',
        backgroundColor: isOver ? 'var(--color-bg-secondary)' : undefined,
      }}
    >
      <DailySectionHeader taskCount={tasks.length} />

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {tasks.map((task) => (
            <SortableTaskRow
              key={task.id}
              task={task}
              containerId="daily"
              isReadOnly={isReadOnly}
              selectedDate={selectedDate}
              isExpanded={expandedTaskId === task.id}
              onToggle={onToggle}
              priorityTier={priorityTiers?.[task.id]}
            />
          ))}
        </div>
      </SortableContext>

      {!isReadOnly && (
        <InlineTaskInput selectedDate={selectedDate} enableAiSuggest={enableAiSuggest} />
      )}
    </section>
  )
}
