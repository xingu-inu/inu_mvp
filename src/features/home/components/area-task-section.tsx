'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AreaSectionHeader } from './area-section-header'
import { CompactTaskRow } from './compact-task-row'
import { InlineTaskInput } from './inline-task-input'
import { SortableTaskItem, type DragHandleProps } from '@/components/common'
import { cn } from '@/lib/utils'
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
  containerId?: never
  dragHandleProps?: never
}

interface SortableAreaTaskSectionProps extends AreaTaskSectionBaseProps {
  sortable: true
  containerId: string
  area: { id: string; name: string; emoji: string; color: string; sort_order: string }
  dragHandleProps: DragHandleProps
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
  containerId,
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
}: SortableAreaTaskSectionProps) {
  const {
    setActivatorRef,
    listeners: handleListeners,
    attributes: handleAttributes,
  } = dragHandleProps

  // Droppable container for cross-section task DnD
  const { setNodeRef, isOver } = useDroppable({
    id: containerId,
    data: { type: 'container' as const },
  })

  const taskIds = tasks.map((t) => t.id)

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`area-${area.id}`}
      className={cn('border-l-2 pl-3 transition-all', isOver && 'bg-accent/30 rounded-md')}
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

      {/* Tasks — SortableContext only (DndContext is in parent SortableTaskList) */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {tasks.map((task) => (
            <SortableTaskItem key={task.id} id={task.id} data={{ type: 'task' as const }}>
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
