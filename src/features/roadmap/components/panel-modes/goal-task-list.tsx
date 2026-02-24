'use client'

import { memo, useState, useEffect, useMemo, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useDeleteTask, useUpdateTask, useReorderTasks } from '@/queries/use-tasks'
import { TASK_STATUS_MESSAGES } from '@/lib/task-status'
import { DragOverlayCard } from '@/components/common'
import { useStandardSensors, DROP_ANIMATION } from '@/lib/dnd/dnd-config'
import { type InlineMode } from '@/stores/roadmap.store'
import { InlineTaskEdit, InlineDeleteConfirm } from '../inline-forms'
import { useDeleteConfirm } from '@/features/roadmap/hooks'
import { TaskRow } from './task-row'
import { SortableTaskItem } from './sortable-wrappers'
import type { Area, Task, TaskStatus } from '@/types/entities'

/* ── Task list (presentation only, no DndContext) ── */

export const TaskList = memo(function TaskList({
  containerId,
  taskIds,
  tasksById,
  areaMap,
  goalId,
  inlineMode,
  onTaskClick,
  clearInline,
}: {
  containerId: string
  taskIds: string[]
  tasksById: Map<string, Task>
  areaMap: Map<string, Area>
  goalId: string
  inlineMode: InlineMode
  onTaskClick: (taskId: string) => void
  clearInline: () => void
}) {
  const deleteTask = useDeleteTask()
  const updateTask = useUpdateTask()
  const taskDelete = useDeleteConfirm()

  const handleStatusChange = useCallback(
    (taskId: string, status: TaskStatus, reason?: string, note?: string) => {
      updateTask.mutate(
        {
          id: taskId,
          input: {
            status,
            ...(reason ? { status_change_reason: reason } : {}),
            ...(note ? { status_change_note: note } : {}),
          },
        },
        {
          onSuccess: () => {
            const message = TASK_STATUS_MESSAGES[status]
            if (message) toast.success(message)
          },
        }
      )
    },
    [updateTask]
  )

  return (
    <SortableContext id={containerId} items={taskIds} strategy={verticalListSortingStrategy}>
      <div className="min-h-[8px] space-y-1">
        {taskIds.map((taskId) => {
          const task = tasksById.get(taskId)
          if (!task) return null

          const isEditingTask =
            inlineMode !== null &&
            typeof inlineMode === 'object' &&
            inlineMode.type === 'edit-task' &&
            inlineMode.taskId === task.id

          return (
            <SortableTaskItem key={task.id} id={task.id}>
              <TaskRow
                task={task}
                areaMap={areaMap}
                goalId={goalId}
                onEdit={() => onTaskClick(task.id)}
                onDelete={() => taskDelete.toggleDelete(task.id)}
                onStatusChange={(status, reason, note) =>
                  handleStatusChange(task.id, status, reason, note)
                }
                isExpanded={isEditingTask}
                onToggle={() => onTaskClick(task.id)}
              />
              <AnimatePresence initial={false}>
                {isEditingTask && (
                  <motion.div
                    key="edit-form"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <InlineTaskEdit task={task} onDone={clearInline} />
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {taskDelete.isDeleting(task.id) && (
                  <InlineDeleteConfirm
                    title="이 할 일을 삭제할까요?"
                    onCancel={taskDelete.clearDelete}
                    onConfirm={() => {
                      deleteTask.mutate(task.id, {
                        onSuccess: taskDelete.clearDelete,
                      })
                    }}
                    isLoading={deleteTask.isPending}
                  />
                )}
              </AnimatePresence>
            </SortableTaskItem>
          )
        })}
      </div>
    </SortableContext>
  )
})

/* ── Flat task list with own DndContext (for Groups OFF mode) ── */

export const FlatTaskListWithDnd = memo(function FlatTaskListWithDnd({
  tasks,
  areaMap,
  goalId,
  inlineMode,
  onTaskClick,
  clearInline,
  sensors,
  reorderTasks,
}: {
  tasks: Task[]
  areaMap: Map<string, Area>
  goalId: string
  inlineMode: InlineMode
  onTaskClick: (taskId: string) => void
  clearInline: () => void
  sensors: ReturnType<typeof useStandardSensors>
  reorderTasks: ReturnType<typeof useReorderTasks>
}) {
  const [localTasks, setLocalTasks] = useState(tasks)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  const tasksById = useMemo(() => new Map(localTasks.map((t) => [t.id, t])), [localTasks])
  const activeTask = activeTaskId ? tasksById.get(activeTaskId) : null

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTaskId(null)
      const { active, over } = event
      if (over && active.id !== over.id) {
        setLocalTasks((prev) => {
          const oldIndex = prev.findIndex((t) => t.id === active.id)
          const newIndex = prev.findIndex((t) => t.id === over.id)
          if (oldIndex === -1 || newIndex === -1) return prev
          return arrayMove(prev, oldIndex, newIndex)
        })
        const oldIds = localTasks.map((t) => t.id)
        const oldIndex = oldIds.indexOf(active.id as string)
        const newIndex = oldIds.indexOf(over.id as string)
        if (oldIndex !== -1 && newIndex !== -1) {
          const newIds = arrayMove(oldIds, oldIndex, newIndex)
          reorderTasks.mutate({ goalId, ids: newIds })
        }
      }
    },
    [localTasks, goalId, reorderTasks]
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveTaskId(event.active.id as string)
      clearInline()
    },
    [clearInline]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <TaskList
        containerId="flat"
        taskIds={localTasks.map((t) => t.id)}
        tasksById={tasksById}
        areaMap={areaMap}
        goalId={goalId}
        inlineMode={inlineMode}
        onTaskClick={onTaskClick}
        clearInline={clearInline}
      />
      <DragOverlay dropAnimation={DROP_ANIMATION}>
        {activeTask ? (
          <DragOverlayCard>
            <TaskRow
              task={activeTask}
              areaMap={areaMap}
              goalId={goalId}
              onEdit={() => {}}
              onDelete={() => {}}
              onStatusChange={() => {}}
            />
          </DragOverlayCard>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
})
