'use client'

import { Trash2 } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useDeleteTask } from '@/queries/use-tasks'
import { cn } from '@/lib/utils'
import { InlineTaskEdit, InlineDeleteConfirm } from '../inline-forms'
import type { Task } from '@/types/entities'

interface GoalTaskItemProps {
  task: Task
  /** Whether this task is currently in inline edit mode */
  isEditing: boolean
  /** Whether deletion confirmation is showing for this task */
  isDeleting: boolean
  /** Called when user clicks the task row (to enter edit mode) */
  onEdit: () => void
  /** Called when inline edit form is dismissed */
  onEditDone: () => void
  /** Called when delete toggle button is clicked */
  onDeleteToggle: () => void
  /** Called when delete is cancelled or confirmed */
  onDeleteClear: () => void
  /** Visual variant: 'flat' uses bg-secondary; 'nested' uses transparent bg */
  variant?: 'flat' | 'nested'
}

export function GoalTaskItem({
  task,
  isEditing,
  isDeleting,
  onEdit,
  onEditDone,
  onDeleteToggle,
  onDeleteClear,
  variant = 'flat',
}: GoalTaskItemProps) {
  const deleteTask = useDeleteTask()

  return (
    <div>
      <AnimatePresence>
        {isEditing && <InlineTaskEdit task={task} onDone={onEditDone} />}
      </AnimatePresence>
      {!isEditing && (
        <>
          <div className={cn('group/task flex items-center', variant === 'flat' && 'gap-1')}>
            <button
              className={cn(
                'flex flex-1 items-center justify-between rounded-lg px-3 text-left transition-colors',
                variant === 'flat'
                  ? 'bg-[var(--color-bg-secondary)] py-2.5 hover:bg-[var(--color-bg-tertiary)]'
                  : 'py-2 hover:bg-[var(--color-bg-secondary)]'
              )}
              onClick={onEdit}
            >
              <span className="text-sm">{task.name}</span>
              {task.streak_count > 0 && (
                <span className="text-xs text-[var(--color-streak)]">🔥 {task.streak_count}</span>
              )}
            </button>
            <button
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--color-miss)] transition-opacity hover:bg-[var(--color-bg-tertiary)] lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/task:opacity-100"
              onClick={onDeleteToggle}
              title="할 일 삭제"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
          <AnimatePresence>
            {isDeleting && (
              <InlineDeleteConfirm
                title="이 할 일을 삭제할까요?"
                onCancel={onDeleteClear}
                onConfirm={() => {
                  deleteTask.mutate(task.id, {
                    onSuccess: onDeleteClear,
                  })
                }}
                isLoading={deleteTask.isPending}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
