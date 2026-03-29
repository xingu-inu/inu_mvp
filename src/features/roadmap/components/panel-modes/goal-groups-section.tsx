'use client'

import { useCallback } from 'react'
import { Trash2, Circle, CheckCircle2 } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useRoadmapStore, selectInlineMode } from '@/stores/roadmap.store'
import { useDeleteGroup } from '@/queries/use-groups'
import { useDeleteConfirm } from '@/features/roadmap/hooks'
import { cn } from '@/lib/utils'
import {
  InlineTaskQuickInput,
  InlineGroupCreate,
  InlineGroupEdit,
  InlineDeleteConfirm,
} from '../inline-forms'
import { GoalTaskItem } from '../shared/goal-task-item'
import { CrossLinkedTaskSection } from '../shared/cross-linked-task-section'
import type { CrossLinkedTaskWithMeta } from '@/features/roadmap/hooks/use-cross-linked-tasks'
import type { Group, Task, Goal } from '@/types/entities'

interface GoalGroupsSectionProps {
  goalId: string
  goalAreaId: string
  groups: Group[]
  activeTasks: Task[]
  crossLinkedByGroup: Map<string | null, CrossLinkedTaskWithMeta[]>
  allGoals: Goal[]
}

export function GoalGroupsSection({
  goalId,
  goalAreaId,
  groups,
  activeTasks,
  crossLinkedByGroup,
  allGoals,
}: GoalGroupsSectionProps) {
  const inlineMode = useRoadmapStore(selectInlineMode)
  const setInlineMode = useRoadmapStore((s) => s.setInlineMode)
  const deleteGroup = useDeleteGroup()
  const groupDelete = useDeleteConfirm()
  const taskDelete = useDeleteConfirm()

  const handleGroupClick = useCallback(
    (groupId: string) => {
      setInlineMode({ type: 'edit-group', groupId })
    },
    [setInlineMode]
  )

  return (
    <>
      {/* Inline Group Create */}
      <AnimatePresence>
        {inlineMode === 'create-group' && (
          <div className="mb-2">
            <InlineGroupCreate goalId={goalId} onDone={() => setInlineMode(null)} />
          </div>
        )}
      </AnimatePresence>

      {/* Group Sections */}
      <div className="space-y-3">
        {groups.map((group) => {
          const ownTasks = activeTasks.filter((t) => t.group_id === group.id)
          const groupTasks = !group.is_completed
            ? [...ownTasks, ...activeTasks.filter((t) => !t.group_id)]
            : ownTasks
          const isEditingGroup =
            inlineMode !== null &&
            typeof inlineMode === 'object' &&
            inlineMode.type === 'edit-group' &&
            inlineMode.groupId === group.id
          return (
            <div key={group.id}>
              <AnimatePresence>
                {isEditingGroup && (
                  <InlineGroupEdit
                    goalId={goalId}
                    groupId={group.id}
                    onDone={() => setInlineMode(null)}
                  />
                )}
              </AnimatePresence>

              {!isEditingGroup && (
                <>
                  <div className="group/grp flex items-center gap-1">
                    <button
                      className="flex flex-1 items-center justify-between rounded-lg bg-[var(--color-bg-secondary)] p-3 transition-colors hover:bg-[var(--color-bg-tertiary)]"
                      onClick={() => handleGroupClick(group.id)}
                    >
                      <div className="flex items-center gap-3">
                        {group.is_completed ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-done)]" />
                        ) : (
                          <Circle className="h-5 w-5 shrink-0 text-[var(--color-primary-500)]" />
                        )}
                        <span
                          className={cn(
                            group.is_completed && 'text-[var(--color-text-tertiary)] line-through'
                          )}
                        >
                          {group.name}
                        </span>
                      </div>
                    </button>
                    <button
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-miss)] transition-opacity hover:bg-[var(--color-bg-tertiary)] lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/grp:opacity-100"
                      onClick={() => groupDelete.toggleDelete(group.id)}
                      title="그룹 삭제"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <AnimatePresence>
                    {groupDelete.isDeleting(group.id) && (
                      <InlineDeleteConfirm
                        title="이 그룹을 삭제할까요?"
                        description="그룹에 포함된 할 일은 삭제되지 않아요."
                        onCancel={groupDelete.clearDelete}
                        onConfirm={() => {
                          deleteGroup.mutate(
                            { id: group.id, goalId },
                            { onSuccess: groupDelete.clearDelete }
                          )
                        }}
                        isLoading={deleteGroup.isPending}
                      />
                    )}
                  </AnimatePresence>
                  {groupTasks.length > 0 && (
                    <div className="mt-1 ml-4 space-y-1 border-l-2 border-[var(--color-border)] pl-3">
                      {groupTasks.map((task) => {
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
                            variant="nested"
                          />
                        )
                      })}
                    </div>
                  )}
                  {!group.is_completed && (
                    <div className="ml-4">
                      <InlineTaskQuickInput goalId={goalId} groupId={group.id} />
                    </div>
                  )}
                  <CrossLinkedTaskSection
                    crossLinkedTasks={crossLinkedByGroup.get(group.id)}
                    goalId={goalId}
                    goalAreaId={goalAreaId}
                    allGoals={allGoals}
                    onNavigate={(sourceGoalId) =>
                      useRoadmapStore.getState().select({ type: 'goal', id: sourceGoalId })
                    }
                    className="mt-1 ml-4 space-y-0.5 border-l-2 border-dashed border-[var(--color-border)] pl-3"
                  />
                </>
              )}
            </div>
          )
        })}
      </div>

      <CrossLinkedTaskSection
        crossLinkedTasks={crossLinkedByGroup.get(null)}
        goalId={goalId}
        goalAreaId={goalAreaId}
        allGoals={allGoals}
        onNavigate={(sourceGoalId) =>
          useRoadmapStore.getState().select({ type: 'goal', id: sourceGoalId })
        }
        className="mt-2 space-y-0.5"
      />
    </>
  )
}
