'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, startOfWeek } from 'date-fns'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core'
import { safeNewOrderBetween } from '@/lib/fractional-index'
import { moveNode, type MoveNodeInput } from '@/actions/tree.actions'
import { queryKeys } from '@/lib/query/keys'
import { snapshotHomeCaches, patchTaskInHomeCaches } from '@/lib/utils/home-cache-utils'
import type { HomeTask } from '@/types/entities'
import type { HomeTaskDto as ActionHomeTask } from '@/actions/home.actions'
import type { AreaGroup } from '@/lib/utils/task-utils'

const DAILY_CONTAINER = 'daily'

export interface PendingCrossMove {
  taskId: string
  targetContainerId: string
  targetGoals: Array<{ id: string; name: string }>
  newOrder: string
}

/** Mutation variables — carries the server input and optimistic patch info */
interface DndMutationVars {
  input: MoveNodeInput
  optimistic?: { type: 'task'; taskId: string; patch: Partial<ActionHomeTask> }
}

/**
 * Hook for task DnD — used in the INNER DndContext (closestCorners).
 * Handles same-area reorder, cross-area moves, and daily↔area moves.
 * Area reorder is handled separately by useAreaDnd in the outer DndContext.
 */
export function useTaskDnd(areaGroups: AreaGroup[], dailyTasks: HomeTask[], selectedDate: Date) {
  const queryClient = useQueryClient()
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const weekStartStr = format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')

  // ── Drag state ──
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [pendingCrossMove, setPendingCrossMove] = useState<PendingCrossMove | null>(null)
  const [overContainerId, setOverContainerId] = useState<string | null>(null)

  // ── tasksById lookup map ──
  const tasksById = useMemo(() => {
    const map = new Map<string, HomeTask>()
    for (const group of areaGroups) {
      for (const task of group.tasks) {
        map.set(task.id, task)
      }
    }
    for (const task of dailyTasks) {
      map.set(task.id, task)
    }
    return map
  }, [areaGroups, dailyTasks])

  // ── Base containers from props (ID-only, roadmap pattern) ──
  const baseContainers = useMemo(() => {
    const containers: Record<string, string[]> = {}
    for (const group of areaGroups) {
      containers[group.area.id] = group.tasks.map((t) => t.id)
    }
    containers[DAILY_CONTAINER] = dailyTasks.map((t) => t.id)
    return containers
  }, [areaGroups, dailyTasks])

  // ── Drag overlay state (set during drag, null otherwise) ──
  const [dragContainers, setDragContainers] = useState<Record<string, string[]> | null>(null)

  // Active state = drag overlay ?? base
  const taskContainers = dragContainers ?? baseContainers

  // Source container ref — tracks where a task originated at drag start
  const dragSourceContainer = useRef<string | null>(null)

  // Auto-clear drag overlay once base containers catch up from cache update.
  useEffect(() => {
    if (!activeTaskId && !pendingCrossMove && dragContainers) {
      setDragContainers(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseContainers])

  // ── Server mutation ──
  const mutation = useMutation({
    mutationFn: (vars: DndMutationVars) => moveNode(vars.input),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'home'] })
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      const snapshot = snapshotHomeCaches(queryClient, dateStr, weekStartStr)

      if (vars.optimistic) {
        patchTaskInHomeCaches(
          queryClient,
          dateStr,
          weekStartStr,
          vars.optimistic.taskId,
          vars.optimistic.patch
        )
      }

      return snapshot
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.tasks.home(dateStr), context.daily)
        queryClient.setQueryData(queryKeys.tasks.homeWeek(weekStartStr), context.weekly)
      }
      toast.error('이동에 실패했어요. 다시 시도해주세요.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'home'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })

  // ── Find which container holds a given ID ──
  const findContainer = useCallback(
    (id: string | number): string | undefined => {
      const sid = String(id)
      if (sid in taskContainers) return sid
      return Object.keys(taskContainers).find((key) => taskContainers[key].includes(sid))
    },
    [taskContainers]
  )

  // ── Calculate new sort_order based on position in target container ──
  const calculateNewOrder = useCallback(
    (containerId: string, targetIndex: number, excludeTaskId?: string): string => {
      const ids = (taskContainers[containerId] ?? []).filter((id) => id !== excludeTaskId)
      const tasks = ids.map((id) => tasksById.get(id)).filter(Boolean) as HomeTask[]

      if (tasks.length === 0) return safeNewOrderBetween(null, null)
      if (targetIndex <= 0) return safeNewOrderBetween(null, tasks[0].sort_order)
      if (targetIndex >= tasks.length)
        return safeNewOrderBetween(tasks[tasks.length - 1].sort_order, null)

      return safeNewOrderBetween(tasks[targetIndex - 1].sort_order, tasks[targetIndex].sort_order)
    },
    [taskContainers, tasksById]
  )

  // ═══════════════════════════════════════
  // Drag Handlers (task only — no area)
  // ═══════════════════════════════════════

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id)
      setActiveTaskId(id)
      dragSourceContainer.current = findContainer(id) ?? null
      setDragContainers({ ...baseContainers })
    },
    [findContainer, baseContainers]
  )

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over || !dragContainers) return

      const activeId = String(active.id)
      const overId = String(over.id)

      const activeContainer = findContainer(activeId)
      if (!activeContainer) return

      // Determine target container from over data
      const overData = over.data.current as { type?: string; containerId?: string } | undefined
      let overContainer: string | undefined

      if (overData?.type === 'container') {
        // Droppable container (useDroppable on area task list or daily section)
        overContainer = overData.containerId
      } else if (overData?.type === 'task') {
        // Task sortable — find its container
        overContainer = overData.containerId ?? findContainer(overId)
      } else {
        // Fallback: check if overId itself is a known container
        overContainer = findContainer(overId)
      }

      if (!overContainer || activeContainer === overContainer) {
        // No container change — clear hover indicator
        if (overContainer && activeContainer === overContainer) {
          setOverContainerId(null)
        }
        return
      }

      // Set hover indicator for target container
      setOverContainerId(overContainer)

      // Cross-container preview: move task ID between containers
      setDragContainers((prev) => {
        if (!prev) return prev
        const sourceItems = [...(prev[activeContainer] ?? [])]
        const destItems = [...(prev[overContainer] ?? [])]
        const activeIndex = sourceItems.indexOf(activeId)
        if (activeIndex === -1) return prev

        sourceItems.splice(activeIndex, 1)
        const overIndex = destItems.indexOf(overId)
        const insertIndex = overIndex >= 0 ? overIndex : destItems.length
        destItems.splice(insertIndex, 0, activeId)

        return {
          ...prev,
          [activeContainer]: sourceItems,
          [overContainer]: destItems,
        }
      })
    },
    [dragContainers, findContainer]
  )

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveTaskId(null)
      setOverContainerId(null)

      if (!over || !dragContainers) {
        dragSourceContainer.current = null
        setDragContainers(null)
        return
      }

      const taskId = String(active.id)
      const currentContainer = findContainer(taskId)
      const sourceContainer = dragSourceContainer.current
      dragSourceContainer.current = null

      if (!currentContainer) {
        setDragContainers(null)
        return
      }

      // Cross-move detection: did the task leave its original container?
      const isCrossMove = sourceContainer != null && sourceContainer !== currentContainer

      if (!isCrossMove) {
        // ─── Same container reorder ───
        const overId = String(over.id)
        const containerIds = taskContainers[currentContainer] ?? []
        const oldIndex = containerIds.indexOf(taskId)
        let overIndex = containerIds.indexOf(overId)

        // Dropped on the container itself (not a task) → treat as "drop at end"
        if (overIndex === -1 && overId in taskContainers) {
          overIndex = containerIds.length - 1
        }

        if (overIndex === -1 || oldIndex === -1 || oldIndex === overIndex) {
          setDragContainers(null)
          return
        }

        const reordered = arrayMove(containerIds, oldIndex, overIndex)
        setDragContainers((prev) => (prev ? { ...prev, [currentContainer]: reordered } : prev))

        const targetIdx = reordered.indexOf(taskId)
        const prevTask = targetIdx > 0 ? tasksById.get(reordered[targetIdx - 1]) : null
        const nextTask =
          targetIdx < reordered.length - 1 ? tasksById.get(reordered[targetIdx + 1]) : null
        const newOrder = safeNewOrderBetween(
          prevTask?.sort_order ?? null,
          nextTask?.sort_order ?? null
        )

        mutation.mutate({
          input: { nodeId: taskId, nodeType: 'task', newOrder },
          optimistic: { type: 'task', taskId, patch: { sortOrder: newOrder } },
        })
        return
      }

      // ─── Cross-container move ───
      const containerIds = taskContainers[currentContainer] ?? []
      const taskIndex = containerIds.indexOf(taskId)
      const newOrder = calculateNewOrder(currentContainer, taskIndex, taskId)

      if (currentContainer === DAILY_CONTAINER) {
        // Moving to daily → goalId = null
        mutation.mutate({
          input: { nodeId: taskId, nodeType: 'task', newOrder, newParentId: null },
          optimistic: {
            type: 'task',
            taskId,
            patch: {
              sortOrder: newOrder,
              goalId: null,
              goal: null,
              groupId: null,
              group: null,
            },
          },
        })
        return
      }

      // Moving to an area — need to determine goal
      const targetAreaGroup = areaGroups.find((g) => g.area.id === currentContainer)
      const goals = targetAreaGroup?.goals ?? []

      if (goals.length === 1) {
        const targetGoal = goals[0]
        const targetArea = targetAreaGroup!.area

        mutation.mutate({
          input: { nodeId: taskId, nodeType: 'task', newOrder, newParentId: targetGoal.id },
          optimistic: {
            type: 'task',
            taskId,
            patch: {
              sortOrder: newOrder,
              goalId: targetGoal.id,
              goal: {
                id: targetGoal.id,
                name: targetGoal.name,
                why: null,
                areaId: targetArea.id,
                area: {
                  id: targetArea.id,
                  name: targetArea.name,
                  emoji: targetArea.emoji,
                  color: targetArea.color,
                  why: null,
                  sortOrder: targetArea.sort_order,
                },
              },
              groupId: null,
              group: null,
            },
          },
        })
        return
      }

      if (goals.length > 1) {
        // Multiple goals — show picker, keep drag containers frozen for preview
        setPendingCrossMove({
          taskId,
          targetContainerId: currentContainer,
          targetGoals: goals,
          newOrder,
        })
        return
      }

      // No active goals in this area
      toast.info('이 영역에 활성 목표가 없어요. 로드맵에서 목표를 먼저 만들어주세요.')
      setDragContainers(null)
    },
    [
      dragContainers,
      taskContainers,
      areaGroups,
      tasksById,
      findContainer,
      calculateNewOrder,
      mutation,
    ]
  )

  const onDragCancel = useCallback(() => {
    setActiveTaskId(null)
    setOverContainerId(null)
    dragSourceContainer.current = null
    setDragContainers(null)
  }, [])

  // ─── Goal selection handlers (for cross-area popup) ───

  const confirmCrossMove = useCallback(
    (goalId: string) => {
      if (!pendingCrossMove) return

      const targetAreaGroup = areaGroups.find((g) => g.goals.some((gl) => gl.id === goalId))
      const targetGoal = targetAreaGroup?.goals.find((g) => g.id === goalId)
      const targetArea = targetAreaGroup?.area

      const patch: Partial<ActionHomeTask> | undefined =
        targetGoal && targetArea
          ? {
              sortOrder: pendingCrossMove.newOrder,
              goalId: goalId,
              goal: {
                id: goalId,
                name: targetGoal.name,
                why: null,
                areaId: targetArea.id,
                area: {
                  id: targetArea.id,
                  name: targetArea.name,
                  emoji: targetArea.emoji,
                  color: targetArea.color,
                  why: null,
                  sortOrder: targetArea.sort_order,
                },
              },
              groupId: null,
              group: null,
            }
          : undefined

      mutation.mutate({
        input: {
          nodeId: pendingCrossMove.taskId,
          nodeType: 'task',
          newOrder: pendingCrossMove.newOrder,
          newParentId: goalId,
        },
        optimistic: patch ? { type: 'task', taskId: pendingCrossMove.taskId, patch } : undefined,
      })

      setPendingCrossMove(null)
    },
    [pendingCrossMove, mutation, areaGroups]
  )

  const cancelCrossMove = useCallback(() => {
    setPendingCrossMove(null)
    setDragContainers(null)
  }, [])

  return {
    // Drag state
    activeTaskId,
    pendingCrossMove,
    overContainerId,
    // ID-only containers + lookup map
    taskContainers,
    tasksById,
    // Event handlers
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
    // Cross-move handlers
    confirmCrossMove,
    cancelCrossMove,
  }
}
