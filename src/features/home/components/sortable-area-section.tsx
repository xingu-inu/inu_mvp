'use client'

import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { AreaSectionHeader } from './area-section-header'
import { SortableTaskRow } from './sortable-task-row'
import { InlineTaskInput } from './inline-task-input'
import { cn } from '@/lib/utils'
import type { HomeTask } from '@/types/entities'

interface SortableAreaSectionProps {
  area: { id: string; name: string; emoji: string; color: string; sort_order: string }
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

export function SortableAreaSection({
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
}: SortableAreaSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `area-${area.id}`,
    data: { type: 'area' as const, areaId: area.id },
  })

  // Make area a droppable container for cross-area task moves
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `container-${area.id}`,
    data: { type: 'container' as const, containerId: area.id },
  })

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    borderLeftColor: area.color,
  }

  const taskIds = tasks.map((t) => t.id)

  return (
    <section
      ref={(node) => {
        setSortableRef(node)
        setDroppableRef(node)
      }}
      style={sortableStyle}
      aria-labelledby={`area-${area.id}`}
      className={cn(
        'border-l-2 pl-3 transition-all',
        isOver && 'bg-[var(--color-bg-secondary)] ring-1 ring-[var(--color-primary-200)]'
      )}
    >
      {/* Area header — whole block is draggable */}
      <div
        className="mb-1.5 flex cursor-grab items-center justify-between active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        {...attributes}
        {...listeners}
      >
        <AreaSectionHeader
          area={area}
          stats={stats}
          directionVersion={tasks[0]?.directionVersion}
        />
      </div>

      {/* Task rows (sortable within area) */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {tasks.map((task) => (
            <SortableTaskRow
              key={task.id}
              task={task}
              containerId={area.id}
              isReadOnly={isReadOnly}
              selectedDate={selectedDate}
              isExpanded={expandedTaskId === task.id}
              onToggle={onToggle}
              priorityTier={priorityTiers?.[task.id]}
            />
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
