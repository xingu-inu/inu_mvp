'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, startOfWeek } from 'date-fns'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core'
import { getNewOrderBetween as _getNewOrderBetween } from '@/lib/fractional-index'
import { moveNode, type MoveNodeInput } from '@/actions/tree.actions'
import { queryKeys } from '@/lib/query/keys'
import type { HomeTask } from '@/types/entities'
import type { HomeTask as ActionHomeTask } from '@/actions/home.actions'
import type { AreaGroup } from '@/lib/utils/task-utils'

function isValidFractionalKey(key: string): boolean {
  return key.length > 0 && key[0] >= 'a' && key[0] <= 'z'
}

function sanitizeKey(key: string | null): string | null {
  if (key == null) return null
  return isValidFractionalKey(key) ? key : null
}

function safeNewOrderBetween(before: string | null, after: string | null): string {
  const a = sanitizeKey(before)
  const b = sanitizeKey(after)
  // Guard: if both keys exist and a >= b (duplicate/corrupt sort_order), fall back to appending after a
  if (a != null && b != null && a >= b) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[DnD] sort_order 충돌: "${a}" >= "${b}". append fallback 사용`)
    }
    return _getNewOrderBetween(a, null)
  }
  return _getNewOrderBetween(a, b)
}

const DAILY_CONTAINER = 'daily'

export interface PendingCrossMove {
  taskId: string
  targetContainerId: string
  targetGoals: Array<{ id: string; name: string }>
  newOrder: string
}

interface DragItem {
  type: 'area' | 'task'
  id: string
}

/** Mutation variables — carries the server input and optimistic patch info (applied in onMutate) */
interface DndMutationVars {
  input: MoveNodeInput
  optimistic?:
    | { type: 'task'; taskId: string; patch: Partial<ActionHomeTask> }
    | { type: 'area'; areaId: string; newSortOrder: string }
}

export function useTaskDnd(areaGroups: AreaGroup[], dailyTasks: HomeTask[], selectedDate: Date) {
  const queryClient = useQueryClient()
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const weekStartStr = format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')

  // ── Drag state ──
  const [activeItem, setActiveItem] = useState<DragItem | null>(null)
  const [pendingCrossMove, setPendingCrossMove] = useState<PendingCrossMove | null>(null)

  // ── tasksById lookup map (roadmap pattern) ──
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

  const baseAreaOrder = useMemo(() => areaGroups.map((g) => g.area.id), [areaGroups])

  // ── Drag overlay state (set during drag, null otherwise) ──
  const [dragContainers, setDragContainers] = useState<Record<string, string[]> | null>(null)
  const [dragAreaOrder, setDragAreaOrder] = useState<string[] | null>(null)

  // Active state = drag overlay ?? base
  const taskContainers = dragContainers ?? baseContainers
  const areaOrder = dragAreaOrder ?? baseAreaOrder

  // Source container ref — tracks where a task originated at drag start (roadmap pattern)
  const dragSourceContainer = useRef<string | null>(null)

  // Auto-clear drag overlay once base containers catch up from cache update.
  // Fires only when baseContainers/baseAreaOrder change so the overlay persists
  // until props reflect the optimistic cache update — prevents snap-back.
  useEffect(() => {
    if (!activeItem && !pendingCrossMove && dragContainers) {
      setDragContainers(null)
      setDragAreaOrder(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseContainers, baseAreaOrder])

  // ── Server mutation — canonical TanStack Query optimistic update pattern ──
  const mutation = useMutation({
    mutationFn: (vars: DndMutationVars) => moveNode(vars.input),
    onMutate: async (vars) => {
      // 1. Cancel in-flight refetches — no stale data can overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks', 'home'] })
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      // 2. Snapshot AFTER cancel — guaranteed clean baseline for rollback
      const snapshot = snapshotHomeCaches(queryClient, dateStr, weekStartStr)

      // 3. Apply optimistic patch
      if (vars.optimistic) {
        if (vars.optimistic.type === 'task') {
          patchTaskInHomeCaches(
            queryClient,
            dateStr,
            weekStartStr,
            vars.optimistic.taskId,
            vars.optimistic.patch
          )
        } else {
          patchAreaInHomeCaches(
            queryClient,
            dateStr,
            weekStartStr,
            vars.optimistic.areaId,
            vars.optimistic.newSortOrder
          )
        }
      }

      return snapshot
    },
    onError: (_err, _vars, context) => {
      // Per-mutation rollback via onMutate context (canonical pattern)
      if (context) {
        queryClient.setQueryData(queryKeys.tasks.home(dateStr), context.daily)
        queryClient.setQueryData(queryKeys.tasks.homeWeek(weekStartStr), context.weekly)
      }
      toast.error('이동에 실패했어요. 다시 시도해주세요.')
    },
    onSettled: () => {
      // Broad invalidation on both success and error
      queryClient.invalidateQueries({ queryKey: ['tasks', 'home'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })

  // ── Find which container holds a given ID (roadmap pattern) ──
  const findContainer = useCallback(
    (id: string): string | undefined => {
      if (id in taskContainers) return id
      return Object.keys(taskContainers).find((key) => taskContainers[key].includes(id))
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
  // Drag Handlers
  // ═══════════════════════════════════════

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const data = active.data.current as { type: 'area' | 'task' } | undefined
      if (!data) return

      const id = String(active.id)
      setActiveItem({ type: data.type, id })

      // Record source container for cross-move detection (roadmap pattern)
      if (data.type === 'task') {
        dragSourceContainer.current = findContainer(id) ?? null
      }

      // Snapshot base state into drag overlay
      setDragContainers({ ...baseContainers })
      setDragAreaOrder([...baseAreaOrder])
    },
    [findContainer, baseContainers, baseAreaOrder]
  )

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over || !dragContainers) return

      const activeData = active.data.current as { type: string; containerId?: string } | undefined
      if (!activeData || activeData.type !== 'task') return

      const activeId = String(active.id)
      const overId = String(over.id)

      const activeContainer = findContainer(activeId)
      if (!activeContainer) return

      // Determine target container
      const overData = over.data.current as
        | { type?: string; containerId?: string; areaId?: string }
        | undefined
      let overContainer: string | undefined

      if (overData?.type === 'container') {
        overContainer = overData.containerId
      } else if (overData?.type === 'task') {
        overContainer = overData.containerId ?? findContainer(overId)
      } else if (overData?.type === 'area' && overData.areaId) {
        overContainer = overData.areaId as string
      }

      if (!overContainer || activeContainer === overContainer) return

      // Cross-container preview: move task ID between containers (roadmap pattern)
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
      setActiveItem(null)

      if (!over || !dragContainers) {
        dragSourceContainer.current = null
        setDragContainers(null)
        setDragAreaOrder(null)
        return
      }

      const activeData = active.data.current as
        | { type: string; containerId?: string; areaId?: string }
        | undefined
      if (!activeData) {
        dragSourceContainer.current = null
        setDragContainers(null)
        setDragAreaOrder(null)
        return
      }

      // ─── Area reorder ───
      if (activeData.type === 'area') {
        const activeId = String(active.id)
        const overId = String(over.id)

        if (activeId !== overId && dragAreaOrder) {
          const oldIndex = dragAreaOrder.indexOf(activeId.replace('area-', ''))

          const overData = over.data.current as
            | { type?: string; areaId?: string; containerId?: string }
            | undefined
          let resolvedAreaId: string | null = null
          if (overData?.type === 'area' && overData.areaId) {
            resolvedAreaId = overData.areaId
          } else if (
            overData?.type === 'container' &&
            overData.containerId &&
            overData.containerId !== 'daily'
          ) {
            resolvedAreaId = overData.containerId
          }

          let newIndex = resolvedAreaId ? dragAreaOrder.indexOf(resolvedAreaId) : -1
          if (newIndex < 0) {
            newIndex = dragAreaOrder.length - 1
          }

          if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
            const newOrderArr = arrayMove(dragAreaOrder, oldIndex, newIndex)
            const areaId = activeId.replace('area-', '')

            const areaItems = newOrderArr.map((id) => {
              const group = areaGroups.find((g) => g.area.id === id)
              return { id, sort_order: group?.area.sort_order ?? '' }
            })
            const newSortOrder = calculateNewOrderForArea(areaItems, oldIndex, newIndex)

            mutation.mutate({
              input: { nodeId: areaId, nodeType: 'area', newOrder: newSortOrder },
              optimistic: { type: 'area', areaId, newSortOrder },
            })
            return // useEffect cleans up dragContainers after cache propagation
          }
        }

        setDragContainers(null)
        setDragAreaOrder(null)
        return
      }

      // ─── Task reorder / cross-container move ───
      if (activeData.type === 'task') {
        const taskId = String(active.id)
        const currentContainer = findContainer(taskId)
        const sourceContainer = dragSourceContainer.current
        dragSourceContainer.current = null

        if (!currentContainer) {
          setDragContainers(null)
          setDragAreaOrder(null)
          return
        }

        // Cross-move detection via dragSourceContainer ref (roadmap pattern)
        if (sourceContainer === currentContainer) {
          // Same container reorder — use over.id to determine target position
          const overId = String(over.id)

          // Bug 5 fix: if drop target is a container/area droppable (not a task), skip reorder
          const overItemData = over.data.current as { type?: string } | undefined
          if (overItemData?.type === 'container' || overItemData?.type === 'area') {
            setDragContainers(null)
            setDragAreaOrder(null)
            return
          }

          const containerIds = taskContainers[currentContainer] ?? []
          const oldIndex = containerIds.indexOf(taskId)

          const overIndex = containerIds.indexOf(overId)
          if (overIndex === -1) {
            // overId not found in container — bail out
            setDragContainers(null)
            setDragAreaOrder(null)
            return
          }

          if (oldIndex === -1 || oldIndex === overIndex) {
            setDragContainers(null)
            setDragAreaOrder(null)
            return
          }

          const reordered = arrayMove(containerIds, oldIndex, overIndex)
          // Commit reordered IDs so UI immediately shows new position
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
          return // useEffect cleans up dragContainers after cache propagation
        } else {
          // Cross-container move
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
            return // useEffect cleans up dragContainers after cache propagation
          } else {
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
              return // useEffect cleans up dragContainers after cache propagation
            } else if (goals.length > 1) {
              // Multiple goals — show picker, keep drag containers frozen for preview
              setPendingCrossMove({
                taskId,
                targetContainerId: currentContainer,
                targetGoals: goals,
                newOrder,
              })
              return
            } else {
              // No active goals in this area — clean up immediately (no mutation)
              toast.info('이 영역에 활성 목표가 없어요. 로드맵에서 목표를 먼저 만들어주세요.')
              setDragContainers(null)
              setDragAreaOrder(null)
              return
            }
          }
        }
      }

      setDragContainers(null)
      setDragAreaOrder(null)
    },
    [
      dragContainers,
      dragAreaOrder,
      taskContainers,
      areaGroups,
      tasksById,
      findContainer,
      calculateNewOrder,
      mutation,
    ]
  )

  const onDragCancel = useCallback(() => {
    setActiveItem(null)
    dragSourceContainer.current = null
    setDragContainers(null)
    setDragAreaOrder(null)
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
      // dragContainers cleanup deferred to useEffect (waits for cache propagation)
    },
    [pendingCrossMove, mutation, areaGroups]
  )

  const cancelCrossMove = useCallback(() => {
    setPendingCrossMove(null)
    setDragContainers(null)
    setDragAreaOrder(null)
  }, [])

  return {
    // Drag state
    activeItem,
    pendingCrossMove,
    // ID-only containers + lookup map (roadmap pattern)
    taskContainers,
    areaOrder,
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

// ═══════════════════════════════════════
// Cache helpers — snapshot / patch both daily + weekly caches
// ═══════════════════════════════════════

/** Snapshot both daily and weekly caches for rollback */
function snapshotHomeCaches(
  qc: QueryClient,
  dateStr: string,
  weekStartStr: string
): { daily: unknown; weekly: unknown } {
  return {
    daily: qc.getQueryData(queryKeys.tasks.home(dateStr)),
    weekly: qc.getQueryData(queryKeys.tasks.homeWeek(weekStartStr)),
  }
}

/** Patch a single task in both daily and weekly caches (camelCase fields) */
function patchTaskInHomeCaches(
  qc: QueryClient,
  dateStr: string,
  weekStartStr: string,
  taskId: string,
  patch: Partial<ActionHomeTask>
): void {
  // 1. Daily cache
  const dateKey = queryKeys.tasks.home(dateStr)
  qc.setQueryData<ActionHomeTask[]>(dateKey, (prev) =>
    prev?.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
  )

  // 2. Weekly cache
  const weekKey = queryKeys.tasks.homeWeek(weekStartStr)
  qc.setQueryData<Record<string, ActionHomeTask[]>>(weekKey, (prev) => {
    if (!prev) return prev
    const next = { ...prev }
    for (const [d, tasks] of Object.entries(next)) {
      if (tasks.some((t) => t.id === taskId)) {
        next[d] = tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
        break // task appears in only one date
      }
    }
    return next
  })
}

/** Patch area sort order across both daily and weekly caches */
function patchAreaInHomeCaches(
  qc: QueryClient,
  dateStr: string,
  weekStartStr: string,
  areaId: string,
  newSortOrder: string
): void {
  const patchFn = (t: ActionHomeTask): ActionHomeTask =>
    t.goal?.area?.id === areaId
      ? { ...t, goal: { ...t.goal!, area: { ...t.goal!.area, sortOrder: newSortOrder } } }
      : t

  // Daily cache
  qc.setQueryData<ActionHomeTask[]>(queryKeys.tasks.home(dateStr), (prev) => prev?.map(patchFn))

  // Weekly cache — area sort order affects all days
  qc.setQueryData<Record<string, ActionHomeTask[]>>(
    queryKeys.tasks.homeWeek(weekStartStr),
    (prev) => {
      if (!prev) return prev
      const next: Record<string, ActionHomeTask[]> = {}
      for (const [d, tasks] of Object.entries(prev)) {
        next[d] = tasks.map(patchFn)
      }
      return next
    }
  )
}

// Helper: calculate new sort_order for an area move
function calculateNewOrderForArea(
  items: Array<{ id: string; sort_order: string }>,
  fromIndex: number,
  toIndex: number
): string {
  const itemsWithoutMoving = items.filter((_, i) => i !== fromIndex)
  const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex

  if (adjustedToIndex === 0) {
    return safeNewOrderBetween(null, itemsWithoutMoving[0]?.sort_order ?? null)
  }
  if (adjustedToIndex >= itemsWithoutMoving.length) {
    return safeNewOrderBetween(
      itemsWithoutMoving[itemsWithoutMoving.length - 1]?.sort_order ?? null,
      null
    )
  }

  return safeNewOrderBetween(
    itemsWithoutMoving[adjustedToIndex - 1]?.sort_order ?? null,
    itemsWithoutMoving[adjustedToIndex]?.sort_order ?? null
  )
}
