'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CompactTaskRow } from './compact-task-row'
import type { HomeTask } from '@/types/entities'

interface SortableTaskRowProps {
  task: HomeTask
  containerId: string
  isReadOnly?: boolean
  selectedDate: Date
  isExpanded?: boolean
  onToggle?: (taskId: string) => void
  priorityTier?: number
}

export function SortableTaskRow({
  task,
  containerId,
  isReadOnly,
  selectedDate,
  isExpanded,
  onToggle,
  priorityTier,
}: SortableTaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task' as const, containerId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    touchAction: 'none' as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <CompactTaskRow
        task={task}
        isReadOnly={isReadOnly}
        selectedDate={selectedDate}
        isExpanded={isExpanded}
        onToggle={onToggle}
        priorityTier={priorityTier}
      />
    </div>
  )
}
