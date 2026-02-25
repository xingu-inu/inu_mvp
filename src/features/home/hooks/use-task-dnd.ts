'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, startOfWeek } from 'date-fns'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core'
import { safeNewOrderBetween } from '@/lib/fractional-index'
import { moveNode, type MoveNodeInput } from '@/actions/tree.actions'
import { queryKeys } from '@/lib/query/keys'
import {
  snapshotHomeCaches,
  restoreHomeCaches,
  patchTaskInHomeCaches,
} from '@/lib/utils/home-cache-utils'
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

// ─── Sort Order Calculation ────────────────────────────────────────────────────

/**
 * Calculate the correct sort_order for a task within a container,
 * using the container's CURRENT visual order (ID list).
 *
 * Key fix: uses the reordered container ID list to determine neighbors,
 * then looks up their sort_order from tasksById. This ensures we always
 * calculate relative to the correct visual position, not stale DB order.
 */
function getContainerSortOrder(
  containerTaskIds: string[],
  taskId: string,
  tasksById: Map<string, HomeTask>
): string {
  // Get neighbor IDs excluding the moved task itself
  const neighborIds = containerTaskIds.filter((id) => id !== taskId)

  if (neighborIds.length === 0) return safeNewOrderBetween(null, null)

  const taskIndex = containerTaskIds.indexOf(taskId)
  // Adjust index for the excluded task
  const excludeIdx = containerTaskIds.indexOf(taskId)
  const adjustedIndex = excludeIdx < taskIndex ? taskIndex - 1 : taskIndex

  if (adjustedIndex <= 0) {
    const first = tasksById.get(neighborIds[0])
    return safeNewOrderBetween(null, first?.sort_order ?? null)
  }

  if (adjustedIndex >= neighborIds.length) {
    const last = tasksById.get(neighborIds[neighborIds.length - 1])
    return safeNewOrderBetween(last?.sort_order ?? null, null)
  }

  const before = tasksById.get(neighborIds[adjustedIndex - 1])
  const after = tasksById.get(neighborIds[adjustedIndex])
  return safeNewOrderBetween(before?.sort_order ?? null, after?.sort_order ?? null)
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Home task DnD hook — handles same-area reorder, cross-area moves,
 * and daily<->area moves.
 *
 * State pattern:
 * - serverContainers (useMemo): always up-to-date from props
 * - localContainers (useState): override during drag, null otherwise
 * - taskContainers (computed): local override when frozen, else server
 *
 * The "frozen" gate (activeTaskId || pendingCrossMove || mutation.isPending)
 * ensures containers don't re-derive from props mid-drag.
 */
export function useTaskDnd(areaGroups: AreaGroup[], dailyTasks: HomeTask[], selectedDate: Date) {
  const queryClient = useQueryClient()
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const weekStartStr = format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')

  // ── Drag state ──
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [pendingCrossMove, setPendingCrossMove] = useState<PendingCrossMove | null>(null)
  const dragSourceContainer = useRef<string | null>(null)

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

  // ── Server-derived containers (stable via useMemo) ──
  const serverContainers = useMemo(() => {
    const containers: Record<string, string[]> = {}
    for (const group of areaGroups) {
      containers[group.area.id] = group.tasks.map((t) => t.id)
    }
    containers[DAILY_CONTAINER] = dailyTasks.map((t) => t.id)
    return containers
  }, [areaGroups, dailyTasks])

  // Local override during drag — null means "use server containers"
  const [localContainers, setLocalContainers] = useState<Record<string, string[]> | null>(null)

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
        restoreHomeCaches(queryClient, context)
      }
      toast.error('이동에 실패했어요. 다시 시도해주세요.')
    },
    onSettled: () => {
      // Clear local override so next render uses fresh server data
      setLocalContainers(null)
      queryClient.invalidateQueries({ queryKey: ['tasks', 'home'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })

  // Effective containers: local override when frozen, else server
  const isFrozen = !!activeTaskId || !!pendingCrossMove || mutation.isPending
  const taskContainers = isFrozen && localContainers ? localContainers : serverContainers

  // ── Find which container holds a given ID ──
  const findContainer = useCallback(
    (id: string): string | undefined => {
      if (id in taskContainers) return id
      return Object.keys(taskContainers).find((key) => taskContainers[key].includes(id))
    },
    [taskContainers]
  )

  // ═══════════════════════════════════════
  // Drag Handlers (task only — no area)
  // ═══════════════════════════════════════

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id)
      setActiveTaskId(id)
      // Snapshot current server state into local override
      setLocalContainers({ ...serverContainers })
      dragSourceContainer.current = findContainer(id) ?? null
    },
    [findContainer, serverContainers]
  )

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeId = String(active.id)
      const overId = String(over.id)

      // Get containerId hint from event data (avoids stale closure)
      const overData = over.data.current as { type?: string; containerId?: string } | undefined
      const overContainerHint = overData?.containerId

      // Read source container ref (stable, no stale closure)
      const sourceRef = dragSourceContainer.current

      // Functional updater — stale-closure safe
      setLocalContainers((prev) => {
        if (!prev) return prev

        const findInPrev = (id: string): string | undefined => {
          if (id in prev) return id
          return Object.keys(prev).find((key) => prev[key].includes(id))
        }

        const activeContainer = findInPrev(activeId)
        if (!activeContainer) return prev

        const overContainer = overContainerHint ?? findInPrev(overId)
        if (!overContainer) return prev

        if (activeContainer === overContainer) {
          // Same container: reposition only for cross-moved items.
          // Native same-container drags use dnd-kit CSS transforms,
          // so we must NOT touch state for those — onDragEnd uses over.id.
          if (sourceRef != null && sourceRef !== activeContainer) {
            const items = [...(prev[activeContainer] ?? [])]
            const activeIdx = items.indexOf(activeId)
            const overIdx = items.indexOf(overId)
            if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return prev
            items.splice(activeIdx, 1)
            items.splice(overIdx, 0, activeId)
            return { ...prev, [activeContainer]: items }
          }
          return prev
        }

        // Cross-container: splice between containers
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
    [] // No closure dependencies — all state via functional updater, event data, or ref
  )

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveTaskId(null)

      if (!over) {
        dragSourceContainer.current = null
        setLocalContainers(null)
        return
      }

      const taskId = String(active.id)
      const sourceContainer = dragSourceContainer.current
      dragSourceContainer.current = null

      const currentContainer = findContainer(taskId)
      if (!currentContainer) {
        setLocalContainers(null)
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

        // Dropped on the container itself (not a specific task) → treat as "drop at end"
        if (overIndex === -1 && (overId in taskContainers || overId === currentContainer)) {
          overIndex = containerIds.length - 1
        }

        // If over target not resolved or no actual move, no-op
        if (overIndex === -1 || oldIndex === -1 || oldIndex === overIndex) {
          setLocalContainers(null)
          return
        }

        const reordered = arrayMove(containerIds, oldIndex, overIndex)
        setLocalContainers((prev) => (prev ? { ...prev, [currentContainer]: reordered } : prev))

        // Calculate sort_order from the REORDERED list
        const newOrder = getContainerSortOrder(reordered, taskId, tasksById)

        mutation.mutate({
          input: { nodeId: taskId, nodeType: 'task', newOrder },
          optimistic: { type: 'task', taskId, patch: { sortOrder: newOrder } },
        })
        return
      }

      // ─── Cross-container move ───
      const containerIds = taskContainers[currentContainer] ?? []
      const newOrder = getContainerSortOrder(containerIds, taskId, tasksById)

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

      if (goals.length === 0) {
        setLocalContainers(null)
        toast.info('이 영역에 활성 목표가 없어요. 로드맵에서 목표를 먼저 만들어주세요.')
        return
      }

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

      // Multiple goals — show picker, containers stay frozen via pendingCrossMove
      setPendingCrossMove({
        taskId,
        targetContainerId: currentContainer,
        targetGoals: goals,
        newOrder,
      })
    },
    [taskContainers, areaGroups, tasksById, findContainer, mutation]
  )

  const onDragCancel = useCallback(() => {
    setActiveTaskId(null)
    dragSourceContainer.current = null
    setLocalContainers(null)
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
    setLocalContainers(null)
  }, [])

  return {
    // Drag state
    activeTaskId,
    pendingCrossMove,
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
