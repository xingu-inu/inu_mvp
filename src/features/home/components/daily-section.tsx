'use client'

import { useCallback } from 'react'
import { DndContext, closestCenter, DragOverlay, type DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CompactTaskRow } from './compact-task-row'
import { InlineTaskInput } from './inline-task-input'
import { DailySectionHeader } from './daily-section-header'
import { SortableTaskItem, DragOverlayCard } from '@/components/common'
import { useStandardSensors, DROP_ANIMATION } from '@/lib/dnd/dnd-config'
import { useSectionTaskDnd } from '../hooks/use-section-task-dnd'
import type { HomeTask } from '@/types/entities'

interface DailySectionBaseProps {
  tasks: HomeTask[]
  isReadOnly: boolean
  selectedDate: Date
  expandedTaskId?: string | null
  onToggle?: (taskId: string) => void
  enableAiSuggest?: boolean
  priorityTiers?: Record<string, number> | null
}

interface StaticDailySectionProps extends DailySectionBaseProps {
  sortable?: false
  onDragStart?: never
}

interface SortableDailySectionProps extends DailySectionBaseProps {
  sortable: true
  onDragStart?: () => void
}

type DailySectionProps = StaticDailySectionProps | SortableDailySectionProps

export function DailySection(props: DailySectionProps) {
  if (props.sortable) {
    return <SortableDailySectionInner {...props} />
  }
  return <StaticDailySectionInner {...props} />
}

function StaticDailySectionInner({
  tasks,
  isReadOnly,
  selectedDate,
  expandedTaskId,
  onToggle,
  enableAiSuggest,
}: StaticDailySectionProps) {
  return (
    <section
      aria-labelledby="daily-tasks"
      className="border-l-2 pl-3"
      style={{ borderLeftColor: 'var(--color-text-tertiary)' }}
    >
      <DailySectionHeader taskCount={tasks.length} />
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
        {!isReadOnly && (
          <InlineTaskInput selectedDate={selectedDate} enableAiSuggest={enableAiSuggest} />
        )}
      </div>
    </section>
  )
}

function SortableDailySectionInner({
  tasks,
  isReadOnly,
  selectedDate,
  expandedTaskId,
  onToggle,
  enableAiSuggest,
  priorityTiers,
  onDragStart: onDragStartProp,
}: SortableDailySectionProps) {
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
      aria-labelledby="daily-tasks"
      className="border-l-2 pl-3"
      style={{ borderLeftColor: 'var(--color-text-tertiary)' }}
    >
      <DailySectionHeader taskCount={localTasks.length} />

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

      {!isReadOnly && (
        <InlineTaskInput selectedDate={selectedDate} enableAiSuggest={enableAiSuggest} />
      )}
    </section>
  )
}
