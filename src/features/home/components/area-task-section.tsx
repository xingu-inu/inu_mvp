'use client'

import { AreaSectionHeader } from './area-section-header'
import { CompactTaskRow } from './compact-task-row'
import { InlineTaskInput } from './inline-task-input'
import type { HomeTask } from '@/types/entities'

interface AreaTaskSectionProps {
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

export function AreaTaskSection({
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
}: AreaTaskSectionProps) {
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
