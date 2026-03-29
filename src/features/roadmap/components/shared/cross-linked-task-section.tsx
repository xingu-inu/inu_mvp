'use client'

import { useUpdateTask } from '@/queries/use-tasks'
import { computeUnlinkUpdates } from '@/lib/utils/task-utils'
import { CrossLinkedTaskRow } from './cross-linked-task-row'
import type { CrossLinkedTaskWithMeta } from '@/features/roadmap/hooks/use-cross-linked-tasks'

interface CrossLinkedTaskSectionProps {
  crossLinkedTasks: CrossLinkedTaskWithMeta[] | undefined
  goalId: string
  goalAreaId: string
  allGoals: Array<{ id: string; area_id: string }>
  onNavigate: (sourceGoalId: string) => void
  className?: string
}

export function CrossLinkedTaskSection({
  crossLinkedTasks,
  goalId,
  goalAreaId,
  allGoals,
  onNavigate,
  className,
}: CrossLinkedTaskSectionProps) {
  const updateTask = useUpdateTask()

  if (!crossLinkedTasks?.length) return null

  return (
    <div className={className}>
      {crossLinkedTasks.map(
        ({ task, sourceGoalId, sourceGoalName, sourceAreaEmoji, sourceAreaColor }) => (
          <CrossLinkedTaskRow
            key={task.id}
            task={task}
            sourceGoalId={sourceGoalId}
            sourceGoalName={sourceGoalName}
            sourceAreaEmoji={sourceAreaEmoji}
            sourceAreaColor={sourceAreaColor}
            onUnlink={() => {
              const updates = computeUnlinkUpdates({
                relatedGoalIds: task.related_goal_ids ?? [],
                relatedAreaIds: task.related_area_ids ?? [],
                crossLinkGroupMap: task.cross_link_group_map ?? {},
                unlinkGoalId: goalId,
                unlinkGoalAreaId: goalAreaId,
                allGoals,
              })
              updateTask.mutate({ id: task.id, input: updates })
            }}
            onNavigate={() => onNavigate(sourceGoalId)}
          />
        )
      )}
    </div>
  )
}
