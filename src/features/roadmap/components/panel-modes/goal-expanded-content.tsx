'use client'

import { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Heart,
  ListChecks,
  Calendar1,
  Repeat,
  Pause,
  Play,
  CheckCircle2,
  Circle,
  Check,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  closestCorners,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress'
import { useReorderGroups, useDeleteGroup, useToggleGroupComplete } from '@/queries/use-groups'
import { useDeleteTask, useUpdateTask, useReorderTasks } from '@/queries/use-tasks'
import { useAreas } from '@/queries/use-areas'
import { TASK_STATUS_MESSAGES } from '@/lib/task-status'
import { TaskPausePopover } from '../shared/task-pause-popover'
import { TaskMoveGoalPopover } from '../shared/task-move-goal-popover'
import { OverflowMenu, type OverflowMenuItem } from '../shared/overflow-menu'
import { useGoalWithRelations, useGoals, useUpdateGoal, useDeleteGoal } from '@/queries/use-goals'
import { cn } from '@/lib/utils'
import { useStandardSensors, DROP_ANIMATION } from '@/lib/dnd/dnd-config'
import { useRoadmapStore, selectInlineMode, type InlineMode } from '@/stores/roadmap.store'
import { TIME_SLOT_CONFIG } from '@/lib/constants/time-slots'
import {
  InlineGroupCreate,
  InlineGroupEdit,
  InlineTaskEdit,
  InlineTaskQuickInput,
  InlineDeleteConfirm,
} from '../inline-forms'
import { useDeleteConfirm, useCrossLinkedTasks } from '@/features/roadmap/hooks'
import { computeUnlinkUpdates } from '@/lib/utils/task-utils'
import { Link, Link2Off } from 'lucide-react'
import type { Area, Goal, Task, Group, RepeatType, TaskStatus } from '@/types/entities'

/* ── Constants ── */

const REPEAT_LABELS: Record<RepeatType, string> = {
  once: '1회',
  daily: '매일',
  weekdays: '평일',
  weekends: '주말',
  weekly: '매주',
  custom: '맞춤',
}

function getTaskMetaLabel(task: Task): string {
  const parts: string[] = []
  if (task.repeat_type === 'once') {
    parts.push('1회')
  } else {
    parts.push(`반복 · ${REPEAT_LABELS[task.repeat_type]}`)
  }
  if (task.time_slot !== 'anytime') {
    const config = TIME_SLOT_CONFIG[task.time_slot]
    parts.push(`${config.emoji} ${config.label}`)
  }
  if (task.duration_minutes > 0) {
    parts.push(`${task.duration_minutes}분`)
  }
  return parts.join(' · ')
}

const ORPHANS_CONTAINER_ID = '__orphans__'

/* ── Task row — 2줄 구조 ── */

const TaskRow = memo(function TaskRow({
  task,
  areaMap,
  goalId,
  onEdit,
  onDelete,
  onStatusChange,
  isExpanded,
  onToggle,
}: {
  task: Task
  areaMap: Map<string, Area>
  goalId: string
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: TaskStatus, reason?: string, note?: string) => void
  isExpanded?: boolean
  onToggle?: () => void
}) {
  const [showPausePopover, setShowPausePopover] = useState(false)
  const [showMovePopover, setShowMovePopover] = useState(false)

  const metaLabel = getTaskMetaLabel(task)
  const RepeatIcon = task.repeat_type === 'once' ? Calendar1 : Repeat

  const linkedAreas = task.related_area_ids
    ?.map((id) => areaMap.get(id))
    .filter((a): a is Area => !!a)

  const overflowItems = useMemo((): OverflowMenuItem[] => {
    const items: OverflowMenuItem[] = []

    if (task.status === 'active') {
      items.push({
        label: '일시 정지',
        icon: <Pause className="h-4 w-4" />,
        onClick: () => setShowPausePopover(true),
      })
    }

    items.push({
      label: '수정',
      icon: <Edit2 className="h-4 w-4" />,
      onClick: onEdit,
    })

    items.push({
      label: '이동',
      icon: <ArrowRightLeft className="h-4 w-4" />,
      onClick: () => setShowMovePopover(true),
    })

    items.push({
      label: '삭제',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      variant: 'danger',
    })

    return items
  }, [task.status, onEdit, onDelete])

  return (
    <div
      className={cn(
        'group/task flex items-center rounded-md bg-[var(--color-bg-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]',
        task.status === 'paused' && 'opacity-50',
        task.status === 'completed' && 'opacity-50',
        isExpanded && 'bg-[var(--color-bg-secondary)]'
      )}
    >
      <div
        className={cn('flex flex-1 flex-col px-2.5 py-2', onToggle && 'cursor-pointer')}
        onClick={onToggle}
      >
        {/* Line 1: name + streak */}
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <RepeatIcon className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
            <span
              className={cn(
                'flex-1 truncate text-sm font-medium',
                task.status === 'completed' && 'line-through'
              )}
            >
              {task.name}
            </span>
          </div>
          {task.streak_count > 0 && (
            <span className="shrink-0 text-xs text-[var(--color-streak)]">
              🔥 {task.streak_count}
            </span>
          )}
        </div>
        {/* Line 2: metadata */}
        <p className="mt-0.5 truncate pl-5 text-xs text-[var(--color-text-secondary)]">
          {metaLabel}
        </p>
        {/* Line 3: cross-linked areas (conditional) */}
        {linkedAreas && linkedAreas.length > 0 && (
          <div className="mt-0.5 flex items-center gap-1 pl-5">
            <Link className="h-2.5 w-2.5 shrink-0 text-[var(--color-text-tertiary)]" />
            <p className="truncate text-[11px] text-[var(--color-text-tertiary)]">
              {linkedAreas.map((a) => `${a.emoji} ${a.name}`).join(' · ')}
            </p>
          </div>
        )}
      </div>
      <TaskMoveGoalPopover
        taskId={task.id}
        currentGoalId={goalId}
        open={showMovePopover}
        onOpenChange={setShowMovePopover}
      >
        <div className="flex shrink-0 items-center gap-1 pr-1.5 lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/task:opacity-100">
          {/* Direct status buttons */}
          {task.status === 'active' && task.repeat_type === 'once' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStatusChange('completed')
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="완료"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--color-done)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          )}
          {(task.status === 'paused' || task.status === 'completed') && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStatusChange('active')
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="다시 시작"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--color-primary-500)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}
          {/* Overflow menu */}
          <OverflowMenu
            items={overflowItems}
            hoverGroupClass="group-hover/task:opacity-100"
            triggerClassName="h-7 w-7"
          />
        </div>
      </TaskMoveGoalPopover>

      {/* Expand/collapse chevron */}
      {onToggle && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={isExpanded ? '접기' : '펼치기'}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-all hover:bg-[var(--color-bg-tertiary)]"
        >
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      )}

      {/* TaskPausePopover — rendered outside the menu to avoid nested popovers */}
      <TaskPausePopover
        taskName={task.name}
        onConfirm={(reason, note) => {
          onStatusChange('paused', reason, note)
          setShowPausePopover(false)
        }}
        controlledOpen={showPausePopover}
        onOpenChange={setShowPausePopover}
        trigger={<span />}
      />
    </div>
  )
})

/* ── Group complete toggle badge ── */

const GroupCompleteBadge = memo(function GroupCompleteBadge({
  group,
  goalId,
}: {
  group: Group
  goalId: string
}) {
  const toggleComplete = useToggleGroupComplete()

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleComplete.mutate({ id: group.id, goalId, isCompleted: !group.is_completed })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={toggleComplete.isPending}
      title={group.is_completed ? '완료 해제' : '완료로 표시'}
      className={cn(
        'flex-shrink-0 cursor-pointer p-1.5 transition-all hover:scale-110',
        group.is_completed ? 'text-[var(--color-done)]' : 'text-[var(--color-text-tertiary)]',
        toggleComplete.isPending && 'animate-pulse'
      )}
    >
      {group.is_completed ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
    </button>
  )
})

/* ── Sortable group wrapper ── */

interface GroupDragHandleProps {
  ref: (element: HTMLElement | null) => void
  listeners: ReturnType<typeof useSortable>['listeners']
  attributes: ReturnType<typeof useSortable>['attributes']
}

function SortableGroupItem({
  id,
  children,
}: {
  id: string
  children: (dragHandleProps: GroupDragHandleProps) => React.ReactNode
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    listeners,
    attributes,
  } = useSortable({ id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ ref: setActivatorNodeRef, listeners, attributes })}
    </div>
  )
}

/* ── Sortable task wrapper ── */

function SortableTaskItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

/* ── Task list (presentation only, no DndContext) ── */

const TaskList = memo(function TaskList({
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

const FlatTaskListWithDnd = memo(function FlatTaskListWithDnd({
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
  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  const tasksById = useMemo(() => new Map(localTasks.map((t) => [t.id, t])), [localTasks])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
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

  const handleDragStart = useCallback(() => {
    clearInline()
  }, [clearInline])

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
    </DndContext>
  )
})

/* ── Cross-linked task row (inline within groups) ── */

const CrossLinkedTaskRow = memo(function CrossLinkedTaskRow({
  task,
  sourceGoalName,
  sourceAreaEmoji,
  sourceAreaColor,
  onUnlink,
  onNavigate,
}: {
  task: Task
  sourceGoalName: string
  sourceAreaEmoji: string
  sourceAreaColor: string
  onUnlink: () => void
  onNavigate: () => void
}) {
  const metaLabel = getTaskMetaLabel(task)
  const RepeatIcon = task.repeat_type === 'once' ? Calendar1 : Repeat
  return (
    <div
      className="group/cross flex cursor-pointer items-center rounded-md border-l-2 border-dashed bg-[var(--color-bg-secondary)]/30 transition-colors hover:bg-[var(--color-bg-secondary)]"
      style={{ borderLeftColor: sourceAreaColor || 'var(--color-border)' }}
      onClick={onNavigate}
    >
      <div className="flex flex-1 flex-col px-2.5 py-2">
        {/* Line 1: link icon + name + streak */}
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Link className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-tertiary)]" />
            <RepeatIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-tertiary)]" />
            <span className="flex-1 truncate text-sm font-medium">{task.name}</span>
          </div>
          {task.streak_count > 0 && (
            <span className="shrink-0 text-xs text-[var(--color-streak)]">
              🔥 {task.streak_count}
            </span>
          )}
        </div>
        {/* Line 2: metadata */}
        {metaLabel && (
          <p className="mt-0.5 truncate pl-[30px] text-xs text-[var(--color-text-secondary)]">
            {metaLabel}
          </p>
        )}
        {/* Line 3: source goal */}
        <div className="mt-0.5 flex items-center gap-1 pl-[30px]">
          <p className="truncate text-[11px] text-[var(--color-text-tertiary)]">
            ← {sourceAreaEmoji} {sourceGoalName}
          </p>
        </div>
      </div>
      {/* Unlink button (hover only) */}
      <div className="flex shrink-0 items-center pr-1.5 lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/cross:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onUnlink()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="연결 해제"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-miss)]"
        >
          <Link2Off className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
})

/* ── View mode with inline CRUD ── */

export const GoalExpandedContent = memo(function GoalExpandedContent({
  goal,
  onTaskSelect,
  onEditGoal,
  showDelete,
  onShowDeleteChange,
}: {
  goal: Goal
  onTaskSelect?: (taskId: string) => void
  onEditGoal?: () => void
  showDelete: boolean
  onShowDeleteChange: (show: boolean) => void
}) {
  const { tasks } = useGoalWithRelations(goal.id)
  const { data: allAreas } = useAreas()
  const areaMap = useMemo(() => new Map((allAreas ?? []).map((a) => [a.id, a])), [allAreas])
  const serverGroups = useMemo(
    () => [...(goal.groups ?? [])].sort((a, b) => a.sort_order.localeCompare(b.sort_order)),
    [goal.groups]
  )
  // Local state for smooth DnD — prevents bounce on drop
  const [localGroups, setLocalGroups] = useState(serverGroups)
  useEffect(() => {
    setLocalGroups(serverGroups)
  }, [serverGroups])
  const groups = localGroups
  const inlineMode = useRoadmapStore(selectInlineMode)
  const setInlineMode = useRoadmapStore((s) => s.setInlineMode)

  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const deleteGroup = useDeleteGroup()
  const groupDelete = useDeleteConfirm()
  const { crossLinkedByGroup } = useCrossLinkedTasks(goal.id)
  const { data: allGoals = [] } = useGoals()
  const focusGoal = useRoadmapStore((s) => s.focusGoal)

  const reorderGroups = useReorderGroups()
  const reorderTasks = useReorderTasks()
  const updateTask = useUpdateTask()

  const sensors = useStandardSensors()

  const completedGroups = useMemo(() => groups.filter((g) => g.is_completed).length, [groups])
  const totalGroups = groups.length
  const visibleTasks = useMemo(() => tasks, [tasks])
  const hasGroups = totalGroups > 0

  // Pre-compute tasks by group
  const tasksByGroup = useMemo(() => {
    const map = new Map<string | null, Task[]>()
    for (const task of visibleTasks) {
      const key = task.group_id ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    }
    return map
  }, [visibleTasks])

  // Task lookup by ID
  const tasksById = useMemo(() => new Map(visibleTasks.map((t) => [t.id, t])), [visibleTasks])

  // ── Cross-group DnD state ──

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  // Container mapping: containerId -> taskId[]
  // Syncs from server data, temporarily mutated during drag
  const [taskContainers, setTaskContainers] = useState<Record<string, string[]>>({})

  // Ref to track the "source" container when drag started
  const dragSourceContainer = useRef<string | null>(null)

  // Sync taskContainers from server data
  // Skip during active drag or pending mutations to prevent optimistic flicker
  const isMutating = updateTask.isPending || reorderTasks.isPending
  useEffect(() => {
    if (activeTaskId || isMutating) return
    const containers: Record<string, string[]> = {}
    for (const group of groups) {
      containers[group.id] = (tasksByGroup.get(group.id) ?? []).map((t) => t.id)
    }
    containers[ORPHANS_CONTAINER_ID] = (tasksByGroup.get(null) ?? []).map((t) => t.id)
    setTaskContainers(containers)
  }, [groups, tasksByGroup, activeTaskId, isMutating])

  // Find which container holds a given ID
  const findContainer = useCallback(
    (id: UniqueIdentifier): string | undefined => {
      // Check if the id itself is a container
      if (id in taskContainers) return id as string
      // Search task containers
      return Object.keys(taskContainers).find((key) => taskContainers[key].includes(id as string))
    },
    [taskContainers]
  )

  // Group expand/collapse
  const [groupToggles, setGroupToggles] = useState<Record<string, boolean>>({})

  const expandedGroupIds = useMemo(() => {
    const result = new Set<string>()
    for (const group of groups) {
      const manual = groupToggles[group.id]
      if (manual !== undefined) {
        if (manual) result.add(group.id)
      } else if (!group.is_completed) {
        result.add(group.id)
      }
    }
    return result
  }, [groups, groupToggles])

  const toggleGroupExpanded = (groupId: string) => {
    setGroupToggles((prev) => ({
      ...prev,
      [groupId]: !expandedGroupIds.has(groupId),
    }))
  }

  const clearInline = useCallback(() => setInlineMode(null), [setInlineMode])

  // ── Group DnD handler ──

  const handleGroupDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = groups.findIndex((g) => g.id === active.id)
        const newIndex = groups.findIndex((g) => g.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return
        setLocalGroups((prev) => arrayMove(prev, oldIndex, newIndex))
        const newIds = arrayMove(
          groups.map((g) => g.id),
          oldIndex,
          newIndex
        )
        reorderGroups.mutate({ goalId: goal.id, ids: newIds })
      }
    },
    [groups, goal.id, reorderGroups]
  )

  // ── Task cross-group DnD handlers ──

  const handleTaskDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveTaskId(event.active.id as string)
      dragSourceContainer.current = findContainer(event.active.id) ?? null
      clearInline()
    },
    [findContainer, clearInline]
  )

  const handleTaskDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeContainer = findContainer(active.id)
      let overContainer = findContainer(over.id)

      // If over.id is a container itself (empty group), use it
      if (!overContainer && (over.id as string) in taskContainers) {
        overContainer = over.id as string
      }

      if (!activeContainer || !overContainer || activeContainer === overContainer) return

      // Auto-expand collapsed groups
      if (overContainer !== ORPHANS_CONTAINER_ID && !expandedGroupIds.has(overContainer)) {
        setGroupToggles((prev) => ({ ...prev, [overContainer]: true }))
      }

      setTaskContainers((prev) => {
        const activeItems = [...(prev[activeContainer] ?? [])]
        const overItems = [...(prev[overContainer] ?? [])]

        const activeIndex = activeItems.indexOf(active.id as string)
        if (activeIndex === -1) return prev

        // Determine insertion index in target container
        const overIndex = overItems.indexOf(over.id as string)
        const newIndex = overIndex === -1 ? overItems.length : overIndex

        // Remove from source, insert into target
        activeItems.splice(activeIndex, 1)
        overItems.splice(newIndex, 0, active.id as string)

        return {
          ...prev,
          [activeContainer]: activeItems,
          [overContainer]: overItems,
        }
      })
    },
    [findContainer, taskContainers, expandedGroupIds]
  )

  const handleTaskDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveTaskId(null)

      if (!over) {
        dragSourceContainer.current = null
        return
      }

      const activeContainer = findContainer(active.id)
      const overContainer = findContainer(over.id) ?? (over.id as string)

      if (!activeContainer || !overContainer) {
        dragSourceContainer.current = null
        return
      }

      const sourceContainer = dragSourceContainer.current
      dragSourceContainer.current = null

      const isCrossMove = sourceContainer != null && sourceContainer !== activeContainer

      if (activeContainer === overContainer) {
        const items = taskContainers[activeContainer]
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)

        // Compute final ordering (apply arrayMove if positions differ)
        let finalItems = items
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          finalItems = arrayMove(items, oldIndex, newIndex)
          setTaskContainers((prev) => ({ ...prev, [activeContainer]: finalItems }))
        }

        if (isCrossMove) {
          // Cross-group move: update group_id first, then reorder on success
          const targetGroupId = activeContainer === ORPHANS_CONTAINER_ID ? null : activeContainer
          updateTask.mutate(
            { id: active.id as string, input: { group_id: targetGroupId } },
            { onSuccess: () => reorderTasks.mutate({ goalId: goal.id, ids: finalItems }) }
          )
        } else if (finalItems !== items) {
          // Same-group reorder only
          reorderTasks.mutate({ goalId: goal.id, ids: finalItems })
        }
      }
    },
    [findContainer, taskContainers, goal.id, reorderTasks, updateTask]
  )

  const handleTaskDragCancel = useCallback(() => {
    setActiveTaskId(null)
    dragSourceContainer.current = null
    // Reset to server state
    const containers: Record<string, string[]> = {}
    for (const group of groups) {
      containers[group.id] = (tasksByGroup.get(group.id) ?? []).map((t) => t.id)
    }
    containers[ORPHANS_CONTAINER_ID] = (tasksByGroup.get(null) ?? []).map((t) => t.id)
    setTaskContainers(containers)
  }, [groups, tasksByGroup])

  const handleTaskClick = (taskId: string) => {
    if (onTaskSelect) {
      onTaskSelect(taskId)
    } else {
      // Toggle: close if already editing this task, open otherwise
      const isAlreadyEditing =
        inlineMode !== null &&
        typeof inlineMode === 'object' &&
        inlineMode.type === 'edit-task' &&
        inlineMode.taskId === taskId
      setInlineMode(isAlreadyEditing ? null : { type: 'edit-task', taskId })
    }
  }

  // Orphaned tasks
  const orphanedTaskIds = taskContainers[ORPHANS_CONTAINER_ID] ?? []

  // Active task for DragOverlay
  const activeTask = activeTaskId ? tasksById.get(activeTaskId) : null

  return (
    <div className="space-y-4 border-t border-[var(--color-border)] px-4 py-4">
      {/* Why */}
      {goal.why ? (
        <div className="rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-3 py-2.5">
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-[var(--color-primary-500)] uppercase">
            <Heart className="h-3 w-3" />왜 중요한가요?
          </span>
          <p className="ml-[18px] text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {goal.why}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onEditGoal?.()}
          className="w-full cursor-pointer rounded-lg border border-dashed border-[var(--color-primary-300)] bg-[var(--color-primary-50)] px-3 py-2.5 text-left transition-colors hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-100)]"
        >
          <span className="mb-0.5 flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-[var(--color-primary-400)] uppercase">
            <Heart className="h-3 w-3" />왜 중요한가요?
          </span>
          <p className="ml-[18px] text-xs text-[var(--color-text-tertiary)]">
            이유를 적어두면 꾸준히 하는 데 도움이 돼요
          </p>
        </button>
      )}

      {/* Group Progress */}
      {totalGroups > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[var(--color-text-secondary)] uppercase">
              <Circle className="h-3.5 w-3.5 text-[var(--color-primary-500)]" />
              그룹 현황
            </h4>
            <span className="text-xs">
              {completedGroups}/{totalGroups}
            </span>
          </div>
          <ProgressBar value={completedGroups} max={totalGroups} />
        </div>
      )}

      {/* Structure: Groups ON/OFF */}
      <div>
        {/* Section header */}
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[var(--color-text-secondary)] uppercase">
            <ListChecks className="h-3.5 w-3.5 text-[var(--color-primary-500)]" />
            {hasGroups ? '그룹 · 할 일' : '할 일'}
          </h4>
          {hasGroups && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInlineMode('create-group')}
              className="h-7 gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              그룹
            </Button>
          )}
        </div>

        {!hasGroups ? (
          /* ── Groups OFF: flat task list ── */
          <>
            {visibleTasks.length > 0 && (
              <FlatTaskListWithDnd
                tasks={visibleTasks}
                areaMap={areaMap}
                goalId={goal.id}
                inlineMode={inlineMode}
                onTaskClick={handleTaskClick}
                clearInline={clearInline}
                sensors={sensors}
                reorderTasks={reorderTasks}
              />
            )}

            <InlineTaskQuickInput goalId={goal.id} />

            {/* Cross-linked tasks (flat) */}
            {crossLinkedByGroup
              .get(null)
              ?.map(({ task, sourceGoalId, sourceGoalName, sourceAreaEmoji, sourceAreaColor }) => (
                <CrossLinkedTaskRow
                  key={`cross-${task.id}`}
                  task={task}
                  sourceGoalName={sourceGoalName}
                  sourceAreaEmoji={sourceAreaEmoji}
                  sourceAreaColor={sourceAreaColor}
                  onUnlink={() => {
                    const updates = computeUnlinkUpdates({
                      relatedGoalIds: task.related_goal_ids ?? [],
                      relatedAreaIds: task.related_area_ids ?? [],
                      crossLinkGroupMap: task.cross_link_group_map ?? {},
                      unlinkGoalId: goal.id,
                      unlinkGoalAreaId: goal.area_id,
                      allGoals,
                    })
                    updateTask.mutate({ id: task.id, input: updates })
                  }}
                  onNavigate={() => focusGoal(sourceGoalId)}
                />
              ))}
          </>
        ) : (
          /* ── Groups ON: group structure with cross-group DnD ── */
          <>
            {/* Inline Group Create */}
            <AnimatePresence>
              {inlineMode === 'create-group' && (
                <div className="mb-2">
                  <InlineGroupCreate goalId={goal.id} onDone={clearInline} />
                </div>
              )}
            </AnimatePresence>

            {/* Group Sections (outer: group reorder, inner: task cross-group DnD) */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleGroupDragEnd}
            >
              <SortableContext
                items={groups.map((g) => g.id)}
                strategy={verticalListSortingStrategy}
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleTaskDragStart}
                  onDragOver={handleTaskDragOver}
                  onDragEnd={handleTaskDragEnd}
                  onDragCancel={handleTaskDragCancel}
                >
                  <div className="space-y-3">
                    {groups.map((group) => {
                      const containerTaskIds = taskContainers[group.id] ?? []
                      const isGroupExpanded = expandedGroupIds.has(group.id)
                      const isEditingGroup =
                        inlineMode !== null &&
                        typeof inlineMode === 'object' &&
                        inlineMode.type === 'edit-group' &&
                        inlineMode.groupId === group.id
                      return (
                        <SortableGroupItem key={group.id} id={group.id}>
                          {(dragHandleProps) => (
                            <div
                              className={cn(
                                'overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)]',
                                group.is_completed && 'opacity-60'
                              )}
                            >
                              {/* Group Edit (replaces entire block) */}
                              <AnimatePresence>
                                {isEditingGroup && (
                                  <InlineGroupEdit
                                    goalId={goal.id}
                                    groupId={group.id}
                                    onDone={clearInline}
                                  />
                                )}
                              </AnimatePresence>

                              {!isEditingGroup && (
                                <>
                                  {/* Group Header — entire row is drag handle */}
                                  <div
                                    ref={dragHandleProps.ref}
                                    {...dragHandleProps.attributes}
                                    {...dragHandleProps.listeners}
                                    className="group/grp flex cursor-grab items-center rounded-md bg-[var(--color-bg-tertiary)] transition-colors hover:bg-[var(--color-bg-canvas)] active:cursor-grabbing"
                                    style={{ touchAction: 'none' }}
                                  >
                                    <button
                                      className="flex-shrink-0 cursor-pointer p-2 pr-0"
                                      onClick={() => toggleGroupExpanded(group.id)}
                                      aria-expanded={isGroupExpanded}
                                    >
                                      {isGroupExpanded ? (
                                        <ChevronDown className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                                      )}
                                    </button>
                                    <GroupCompleteBadge group={group} goalId={goal.id} />
                                    <button
                                      className="min-w-0 flex-1 cursor-pointer py-2 text-left"
                                      onClick={() => toggleGroupExpanded(group.id)}
                                      aria-expanded={isGroupExpanded}
                                    >
                                      <span
                                        className={cn(
                                          'block truncate text-sm font-semibold',
                                          group.is_completed &&
                                            'text-[var(--color-text-tertiary)] line-through'
                                        )}
                                      >
                                        {group.name}
                                      </span>
                                      {group.why && (
                                        <span className="block truncate text-xs text-[var(--color-text-tertiary)] italic">
                                          {group.why}
                                        </span>
                                      )}
                                    </button>
                                    <div className="flex items-center gap-1.5 pr-2">
                                      <span className="rounded-full bg-[var(--color-bg-canvas)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
                                        {containerTaskIds.length}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setInlineMode({ type: 'edit-group', groupId: group.id })
                                        }}
                                        title="수정"
                                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-all hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/grp:opacity-100"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          groupDelete.toggleDelete(group.id)
                                        }}
                                        title="삭제"
                                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[var(--color-miss)] transition-all hover:bg-[var(--color-bg-tertiary)] lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/grp:opacity-100"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Group delete confirmation */}
                                  <AnimatePresence>
                                    {groupDelete.isDeleting(group.id) && (
                                      <InlineDeleteConfirm
                                        title="이 그룹을 삭제할까요?"
                                        description="그룹에 포함된 할 일은 삭제되지 않아요."
                                        onCancel={groupDelete.clearDelete}
                                        onConfirm={() => {
                                          deleteGroup.mutate(
                                            { id: group.id, goalId: goal.id },
                                            { onSuccess: groupDelete.clearDelete }
                                          )
                                        }}
                                        isLoading={deleteGroup.isPending}
                                      />
                                    )}
                                  </AnimatePresence>

                                  {/* Expandable Task List */}
                                  <AnimatePresence initial={false}>
                                    {isGroupExpanded && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-3 py-2">
                                          <TaskList
                                            containerId={group.id}
                                            taskIds={containerTaskIds}
                                            tasksById={tasksById}
                                            areaMap={areaMap}
                                            goalId={goal.id}
                                            inlineMode={inlineMode}
                                            onTaskClick={handleTaskClick}
                                            clearInline={clearInline}
                                          />

                                          {/* Quick task input */}
                                          <InlineTaskQuickInput
                                            goalId={goal.id}
                                            groupId={group.id}
                                          />

                                          {/* Cross-linked tasks in this group */}
                                          {crossLinkedByGroup
                                            .get(group.id)
                                            ?.map(
                                              ({
                                                task,
                                                sourceGoalId,
                                                sourceGoalName,
                                                sourceAreaEmoji,
                                                sourceAreaColor,
                                              }) => (
                                                <CrossLinkedTaskRow
                                                  key={`cross-${task.id}`}
                                                  task={task}
                                                  sourceGoalName={sourceGoalName}
                                                  sourceAreaEmoji={sourceAreaEmoji}
                                                  sourceAreaColor={sourceAreaColor}
                                                  onUnlink={() => {
                                                    const updates = computeUnlinkUpdates({
                                                      relatedGoalIds: task.related_goal_ids ?? [],
                                                      relatedAreaIds: task.related_area_ids ?? [],
                                                      crossLinkGroupMap:
                                                        task.cross_link_group_map ?? {},
                                                      unlinkGoalId: goal.id,
                                                      unlinkGoalAreaId: goal.area_id,
                                                      allGoals,
                                                    })
                                                    updateTask.mutate({
                                                      id: task.id,
                                                      input: updates,
                                                    })
                                                  }}
                                                  onNavigate={() => focusGoal(sourceGoalId)}
                                                />
                                              )
                                            )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </>
                              )}
                            </div>
                          )}
                        </SortableGroupItem>
                      )
                    })}
                  </div>

                  {/* Orphaned tasks (no group_id) — only show when orphans exist */}
                  {orphanedTaskIds.length > 0 && (
                    <TaskList
                      containerId={ORPHANS_CONTAINER_ID}
                      taskIds={orphanedTaskIds}
                      tasksById={tasksById}
                      areaMap={areaMap}
                      goalId={goal.id}
                      inlineMode={inlineMode}
                      onTaskClick={handleTaskClick}
                      clearInline={clearInline}
                    />
                  )}

                  {/* Ungrouped cross-linked tasks (shown in orphaned area) */}
                  {crossLinkedByGroup
                    .get(null)
                    ?.map(
                      ({
                        task,
                        sourceGoalId,
                        sourceGoalName,
                        sourceAreaEmoji,
                        sourceAreaColor,
                      }) => (
                        <CrossLinkedTaskRow
                          key={`cross-${task.id}`}
                          task={task}
                          sourceGoalName={sourceGoalName}
                          sourceAreaEmoji={sourceAreaEmoji}
                          sourceAreaColor={sourceAreaColor}
                          onUnlink={() => {
                            const updates = computeUnlinkUpdates({
                              relatedGoalIds: task.related_goal_ids ?? [],
                              relatedAreaIds: task.related_area_ids ?? [],
                              crossLinkGroupMap: task.cross_link_group_map ?? {},
                              unlinkGoalId: goal.id,
                              unlinkGoalAreaId: goal.area_id,
                              allGoals,
                            })
                            updateTask.mutate({ id: task.id, input: updates })
                          }}
                          onNavigate={() => focusGoal(sourceGoalId)}
                        />
                      )
                    )}

                  {/* DragOverlay */}
                  <DragOverlay dropAnimation={DROP_ANIMATION}>
                    {activeTask ? (
                      <div className="rounded-md bg-[var(--color-bg-primary)] shadow-lg ring-2 ring-[var(--color-primary-300)]">
                        <TaskRow
                          task={activeTask}
                          areaMap={areaMap}
                          goalId={goal.id}
                          onEdit={() => {}}
                          onDelete={() => {}}
                          onStatusChange={() => {}}
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      {/* Goal Delete Confirm */}
      <AnimatePresence>
        {showDelete && (
          <div className="border-t border-[var(--color-border)] pt-3">
            <InlineDeleteConfirm
              title="이 목표를 삭제할까요?"
              description="연결된 그룹과 할 일도 함께 삭제됩니다. 삭제 대신 일시 정지로 기록을 보존할 수도 있어요."
              onCancel={() => onShowDeleteChange(false)}
              onConfirm={() => deleteGoal.mutate(goal.id)}
              isLoading={deleteGoal.isPending}
              alternativeAction={{
                label: '일시 정지로 변경',
                onAction: () => {
                  updateGoal.mutate(
                    { id: goal.id, input: { status: 'paused' }, previousStatus: goal.status },
                    { onSuccess: () => onShowDeleteChange(false) }
                  )
                },
                isLoading: updateGoal.isPending,
              }}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
})
