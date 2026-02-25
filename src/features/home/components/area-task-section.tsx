'use client'

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
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
  dragHandleProps?: never
}

interface SortableAreaTaskSectionProps extends AreaTaskSectionBaseProps {
  sortable: true
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
  priorityTiers,
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
            priorityTier={priorityTiers?.[task.id]}
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
}: SortableAreaTaskSectionProps) {
  // Destructure to avoid react-hooks/refs lint rule on property access
  const {
    setActivatorRef,
    listeners: handleListeners,
    attributes: handleAttributes,
  } = dragHandleProps

  // useDroppable for cross-area task drops — filtered from area collision detection
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: area.id,
    data: { type: 'container' as const, containerId: area.id },
  })

  const taskIds = tasks.map((t) => t.id)

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

      {/* Task container — droppable for cross-area task moves */}
      <div
        ref={setDroppableRef}
        className={cn(
          'rounded-md transition-all',
          isOver && 'bg-[var(--color-bg-secondary)] ring-1 ring-[var(--color-primary-200)]'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5">
            {tasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                id={task.id}
                data={{ type: 'task' as const, containerId: area.id }}
              >
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
      </div>
    </section>
  )
}
