'use client'

import { useRoadmapStore, selectInlineMode } from '@/stores/roadmap.store'
import { useDeleteConfirm } from '@/features/roadmap/hooks'
import { InlineTaskQuickInput } from '../inline-forms'
import { GoalTaskItem } from '../shared/goal-task-item'
import { CrossLinkedTaskSection } from '../shared/cross-linked-task-section'
import type { CrossLinkedTaskWithMeta } from '@/features/roadmap/hooks/use-cross-linked-tasks'
import type { Task, Goal } from '@/types/entities'

interface GoalFlatTasksSectionProps {
  goalId: string
  goalAreaId: string
  activeTasks: Task[]
  crossLinkedTasks: CrossLinkedTaskWithMeta[] | undefined
  allGoals: Goal[]
}

export function GoalFlatTasksSection({
  goalId,
  goalAreaId,
  activeTasks,
  crossLinkedTasks,
  allGoals,
}: GoalFlatTasksSectionProps) {
  const inlineMode = useRoadmapStore(selectInlineMode)
  const setInlineMode = useRoadmapStore((s) => s.setInlineMode)
  const taskDelete = useDeleteConfirm()

  return (
    <>
      {/* Flat task list */}
      {activeTasks.length > 0 && (
        <div className="space-y-1">
          {activeTasks.map((task) => {
            const isEditingTask =
              inlineMode !== null &&
              typeof inlineMode === 'object' &&
              inlineMode.type === 'edit-task' &&
              inlineMode.taskId === task.id

            return (
              <GoalTaskItem
                key={task.id}
                task={task}
                isEditing={isEditingTask}
                isDeleting={taskDelete.isDeleting(task.id)}
                onEdit={() => setInlineMode({ type: 'edit-task', taskId: task.id })}
                onEditDone={() => setInlineMode(null)}
                onDeleteToggle={() => taskDelete.toggleDelete(task.id)}
                onDeleteClear={taskDelete.clearDelete}
                variant="flat"
              />
            )
          })}
        </div>
      )}

      <InlineTaskQuickInput goalId={goalId} />

      {/* Cross-linked tasks (flat / no groups) */}
      <CrossLinkedTaskSection
        crossLinkedTasks={crossLinkedTasks}
        goalId={goalId}
        goalAreaId={goalAreaId}
        allGoals={allGoals}
        onNavigate={(sourceGoalId) =>
          useRoadmapStore.getState().select({ type: 'goal', id: sourceGoalId })
        }
        className="mt-1 space-y-0.5"
      />
    </>
  )
}
