'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CompactTaskRow } from './compact-task-row'
import { InlineTaskInput } from './inline-task-input'
import { DailySectionHeader } from './daily-section-header'
import { SortableTaskItem } from '@/components/common'
import { cn } from '@/lib/utils'
import type { HomeTask } from '@/types/entities'

interface DailySectionBaseProps {
  isReadOnly: boolean
  selectedDate: Date
  expandedTaskId?: string | null
  onToggle?: (taskId: string) => void
  enableAiSuggest?: boolean
  priorityTiers?: Record<string, number> | null
}

interface StaticDailySectionProps extends DailySectionBaseProps {
  sortable?: false
  tasks: HomeTask[]
}

interface SortableDailySectionProps extends DailySectionBaseProps {
  sortable: true
  taskIds: string[]
  tasksById: Map<string, HomeTask>
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
  taskIds,
  tasksById,
  isReadOnly,
  selectedDate,
  expandedTaskId,
  onToggle,
  enableAiSuggest,
  priorityTiers,
}: SortableDailySectionProps) {
  // useDroppable for cross-area task drops
  const { setNodeRef, isOver } = useDroppable({
    id: 'daily',
    data: { type: 'container' as const, containerId: 'daily' },
  })

  const tasks = taskIds.map((id) => tasksById.get(id)).filter(Boolean) as HomeTask[]

  return (
    <section
      ref={setNodeRef}
      aria-labelledby="daily-tasks"
      className={cn(
        'border-l-2 pl-3 transition-all',
        isOver && 'bg-[var(--color-bg-secondary)] ring-1 ring-[var(--color-primary-200)]'
      )}
      style={{ borderLeftColor: 'var(--color-text-tertiary)' }}
    >
      <DailySectionHeader taskCount={tasks.length} />

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {tasks.map((task) => (
            <SortableTaskItem
              key={task.id}
              id={task.id}
              data={{ type: 'task' as const, containerId: 'daily' }}
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

      {!isReadOnly && (
        <InlineTaskInput selectedDate={selectedDate} enableAiSuggest={enableAiSuggest} />
      )}
    </section>
  )
}
