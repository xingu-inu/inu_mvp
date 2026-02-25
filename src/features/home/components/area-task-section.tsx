'use client'

import { useCallback } from 'react'
import { DndContext, closestCenter, DragOverlay, type DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AreaSectionHeader } from './area-section-header'
import { CompactTaskRow } from './compact-task-row'
import { InlineTaskInput } from './inline-task-input'
import { SortableTaskItem, DragOverlayCard, type DragHandleProps } from '@/components/common'
import { useStandardSensors, DROP_ANIMATION } from '@/lib/dnd/dnd-config'
import { useSectionTaskDnd } from '../hooks/use-section-task-dnd'
import type { HomeTask } from '@/types/entities'

interface AreaTaskSectionBaseProps {
  area: { id: string; name: string; emoji: string; color: string }
  goals: Array<{ id: string; name: string }>
  tasks: HomeTask[]
  stats: { total: number; completed: number }
  isReadOnly: boolean
  selectedDate: Date
  expandedTaskId?: string | null
  onToggle?: (taskId: string) => void
  enableAiSuggest?: boolean
  priorityTiers?: Record<string, number> | null
}

interface StaticAreaTaskSectionProps extends AreaTaskSectionBaseProps {
  sortable?: false
  dragHandleProps?: never
  onDragStart?: never
}

interface SortableAreaTaskSectionProps extends AreaTaskSectionBaseProps {
  sortable: true
  area: { id: string; name: string; emoji: string; color: string; sort_order: string }
  dragHandleProps: DragHandleProps
  onDragStart?: () => void
}

type AreaTaskSectionProps = StaticAreaTaskSectionProps | SortableAreaTaskSectionProps

export function AreaTaskSection(props: AreaTaskSectionProps) {
  if (props.sortable) {
    return <SortableAreaSectionInner {...props} />
  }
  return <StaticAreaSectionInner {...props} />
}

function StaticAreaSectionInner({
  area,
  goals,
  tasks,
  stats,
  isReadOnly,
  selectedDate,
  expandedTaskId,
  onToggle,
  enableAiSuggest,
  priorityTiers: _priorityTiers,
}: AreaTaskSectionBaseProps) {
  return (
    <section
      aria-labelledby={`area-${area.id}`}
      className="border-l-2 pl-3"
      style={{ borderLeftColor: area.color }}
    >
      {/* Area header */}
      <div className="mb-1.5 flex items-center justify-between">
        <AreaSectionHeader
          area={area}
          stats={stats}
          directionVersion={tasks[0]?.directionVersion}
        />
      </div>

      {/* Task rows */}
      <div className="space-y-0.5">
        {tasks.map((task) => (
          <CompactTaskRow
            key={task.id}
            task={task}
            isReadOnly={isReadOnly}
            selectedDate={selectedDate}
            isExpanded={expandedTaskId === task.id}
            onToggle={onToggle}
          />
        ))}

        {/* Inline quick-add */}
        {!isReadOnly && (
          <InlineTaskInput
            goals={goals.length > 0 ? goals : undefined}
            areaId={area.id}
            selectedDate={selectedDate}
            enableAiSuggest={enableAiSuggest}
          />
        )}
      </div>
    </section>
  )
}

function SortableAreaSectionInner({
  area,
  goals,
  tasks,
  stats,
  isReadOnly,
  selectedDate,
  expandedTaskId,
  onToggle,
  enableAiSuggest,
  priorityTiers,
  dragHandleProps,
  onDragStart: onDragStartProp,
}: SortableAreaTaskSectionProps) {
  const {
    setActivatorRef,
    listeners: handleListeners,
    attributes: handleAttributes,
  } = dragHandleProps

  const sensors = useStandardSensors()
  const { localTasks, activeTask, handleDragStart, handleDragEnd, handleDragCancel } =
    useSectionTaskDnd(tasks, selectedDate)

  const wrappedDragStart = useCallback(
    (event: DragStartEvent) => {
      onDragStartProp?.()
      handleDragStart(event)
    },
    [onDragStartProp, handleDragStart]
  )

  const taskIds = localTasks.map((t) => t.id)

  return (
    <section
      aria-labelledby={`area-${area.id}`}
      className="border-l-2 pl-3 transition-all"
      style={{ borderLeftColor: area.color }}
    >
      {/* Area header — drag handle for area reorder (activator ref pattern) */}
      <div
        ref={setActivatorRef}
        className="mb-1.5 flex cursor-grab items-center justify-between active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        {...handleAttributes}
        {...handleListeners}
      >
        <AreaSectionHeader
          area={area}
          stats={stats}
          directionVersion={tasks[0]?.directionVersion}
        />
      </div>

      {/* Task DnD — own DndContext (isolated from area reorder) */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={wrappedDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5">
            {localTasks.map((task) => (
              <SortableTaskItem key={task.id} id={task.id}>
                <CompactTaskRow
                  task={task}
                  isReadOnly={isReadOnly}
                  selectedDate={selectedDate}
                  isExpanded={expandedTaskId === task.id}
                  onToggle={onToggle}
                  priorityTier={priorityTiers?.[task.id]}
                />
              </SortableTaskItem>
            ))}
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

      {/* Inline quick-add */}
      {!isReadOnly && (
        <InlineTaskInput
          goals={goals.length > 0 ? goals : undefined}
          areaId={area.id}
          selectedDate={selectedDate}
          enableAiSuggest={enableAiSuggest}
        />
      )}
    </section>
  )
}
