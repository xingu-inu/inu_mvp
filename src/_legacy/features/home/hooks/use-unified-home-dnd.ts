'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, startOfWeek } from 'date-fns'
import { arrayMove } from '@dnd-kit/sortable'
import {
  closestCenter,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  type CollisionDetection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { safeNewOrderBetween } from '@/lib/fractional-index'
import { moveNode } from '@/actions/tree.actions'
import { upsertTaskDateSortOrder, moveTaskToSection } from '@/actions/home.actions'
import { queryKeys } from '@/lib/query/keys'
import {
  snapshotHomeCaches,
  restoreHomeCaches,
  patchAreaInHomeCaches,
  patchTaskSortOrderForDate,
  patchTaskInHomeCaches,
} from '@/lib/utils/home-cache-utils'
import type { HomeTaskDto } from '@/actions/home.actions'
import type { HomeTask } from '@/types/entities'
import type { AreaGroup } from '@/lib/utils/task-utils'

export const DAILY_CONTAINER_ID = '__daily__'

/**
 * Unified Home DnD hook — single DndContext for both area reorder and cross-area task DnD.
 *
 * Collision detection discriminates by active item type:
 * - Area drag → only collide with other areas (closestCenter)
 * - Task drag → multi-container collision (pointerWithin containers, closestCenter within)
 *
 * Task mutations:
 * - Same section reorder → upsertTaskDateSortOrder (date-specific)
 * - Cross-section move → moveTaskToSection (structural goal_id change)
 */
export function useUnifiedHomeDnd({
  areaGroups,
  dailyTasks,
  selectedDate,
}: {
  areaGroups: AreaGroup[]
  dailyTasks: HomeTask[]
  selectedDate: Date
}) {
  const queryClient = useQueryClient()
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const weekStartStr = format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')

  // ── Server-derived data ──

  const serverAreaOrder = useMemo(() => areaGroups.map((g) => g.area.id), [areaGroups])

  const serverContainers = useMemo(() => {
    const c: Record<string, string[]> = {}
    for (const g of areaGroups) c[g.area.id] = g.tasks.map((t) => t.id)
    c[DAILY_CONTAINER_ID] = dailyTasks.map((t) => t.id)
    return c
  }, [areaGroups, dailyTasks])

  const allTasksMap = useMemo(() => {
    const m = new Map<string, HomeTask>()
    for (const g of areaGroups) for (const t of g.tasks) m.set(t.id, t)
    for (const t of dailyTasks) m.set(t.id, t)
    return m
  }, [areaGroups, dailyTasks])

  const areaGoalsMap = useMemo(() => {
    const m = new Map<string, Array<{ id: string; name: string }>>()
    for (const g of areaGroups) m.set(g.area.id, g.goals)
    return m
  }, [areaGroups])

  // ── Local state ──

  const [localAreaOrder, setLocalAreaOrder] = useState(serverAreaOrder)
  const [containers, setContainers] = useState(serverContainers)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<'area' | 'task' | null>(null)
  const originContainerRef = useRef<string | null>(null)
  const isMutatingRef = useRef(false)
  // Immediate task patches for instant UI during async onMutate gap
  const taskPatchesRef = useRef(new Map<string, Partial<HomeTask>>())
  // Pre-patch snapshot for rollback (set synchronously in handleDragEnd)
  const moveSnapshotRef = useRef<ReturnType<typeof snapshotHomeCaches> | null>(null)

  // Sync from server (only when not mid-mutation)
  useEffect(() => {
    setLocalAreaOrder(serverAreaOrder)
  }, [serverAreaOrder])
  useEffect(() => {
    if (!isMutatingRef.current) setContainers(serverContainers)
  }, [serverContainers])

  // Clear local task patches once server-derived data arrives
  useEffect(() => {
    if (taskPatchesRef.current.size > 0) {
      taskPatchesRef.current.clear()
    }
  }, [allTasksMap])

  // ── Helpers ──

  const findContainer = useCallback(
    (id: string): string | undefined => {
      if (id in containers) return id
      return Object.keys(containers).find((key) => containers[key].includes(id))
    },
    [containers]
  )

  const activeTask = activeId && activeType === 'task' ? (allTasksMap.get(activeId) ?? null) : null

  // ── Mutations ──

  const areaMutation = useMutation({
    mutationFn: (vars: { nodeId: string; newOrder: string; areaId: string }) =>
      moveNode({ nodeId: vars.nodeId, nodeType: 'area', newOrder: vars.newOrder }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'home'] })
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })
      const snapshot = snapshotHomeCaches(queryClient, dateStr, weekStartStr)
      patchAreaInHomeCaches(queryClient, dateStr, weekStartStr, vars.areaId, vars.newOrder)
      return snapshot
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restoreHomeCaches(queryClient, ctx)
      toast.error('순서 변경에 실패했어요.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'home'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })

  const taskReorderMutation = useMutation({
    mutationFn: (vars: { taskId: string; date: string; sortOrder: string }) =>
      upsertTaskDateSortOrder(vars.taskId, vars.date, vars.sortOrder),
    onMutate: async (vars) => {
      isMutatingRef.current = true
      const dp = [...queryKeys.tasks.all, 'home', dateStr]
      const wp = [...queryKeys.tasks.all, 'home', 'week', weekStartStr]
      await queryClient.cancelQueries({ queryKey: dp })
      await queryClient.cancelQueries({ queryKey: wp })
      const snapshot = snapshotHomeCaches(queryClient, dateStr, weekStartStr)
      patchTaskSortOrderForDate(queryClient, dateStr, weekStartStr, vars.taskId, vars.sortOrder)
      return snapshot
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restoreHomeCaches(queryClient, ctx)
      toast.error('순서 변경에 실패했어요.')
    },
    onSettled: async () => {
      const dp = [...queryKeys.tasks.all, 'home', dateStr]
      const wp = [...queryKeys.tasks.all, 'home', 'week', weekStartStr]
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dp }),
        queryClient.invalidateQueries({ queryKey: wp }),
      ])
      isMutatingRef.current = false
    },
  })

  const taskMoveMutation = useMutation({
    mutationFn: (vars: {
      taskId: string
      newGoalId: string | null
      newSortOrder: string
      date: string
      goalPatch?: HomeTaskDto['goal'] | null
    }) => moveTaskToSection(vars.taskId, vars.newGoalId, vars.newSortOrder, vars.date),
    onMutate: async () => {
      isMutatingRef.current = true
      await queryClient.cancelQueries({ queryKey: ['tasks', 'home'] })
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })
      // Cache was already patched synchronously in handleDragEnd;
      // return the pre-patch snapshot for rollback.
      const snapshot = moveSnapshotRef.current
      moveSnapshotRef.current = null
      return snapshot ?? snapshotHomeCaches(queryClient, dateStr, weekStartStr)
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restoreHomeCaches(queryClient, ctx)
      toast.error('이동에 실패했어요.')
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks', 'home'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
      ])
      isMutatingRef.current = false
    },
  })

  // ── Collision detection ──

  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (activeType === 'area') {
        // Area drag → only collide with other area droppables
        const areaOnly = args.droppableContainers.filter((c) => {
          const d = c.data.current as { type?: string } | undefined
          return d?.type === 'area'
        })
        return closestCenter({ ...args, droppableContainers: areaOnly })
      }

      // Task drag → multi-container collision
      // 1. Find which container the pointer is inside
      const containerOnly = args.droppableContainers.filter((c) => {
        const d = c.data.current as { type?: string } | undefined
        return d?.type === 'container'
      })
      const pointerHits = pointerWithin({ ...args, droppableContainers: containerOnly })

      if (pointerHits.length > 0) {
        const hitId = String(getFirstCollision(pointerHits, 'id'))
        const items = containers[hitId] ?? []
        if (items.length > 0) {
          // 2. Find closest task item within the hit container
          const itemContainers = args.droppableContainers.filter((c) =>
            items.includes(String(c.id))
          )
          const closest = closestCenter({ ...args, droppableContainers: itemContainers })
          if (closest.length > 0) return closest
        }
        // Empty container — return container itself as collision target
        return pointerHits
      }

      // Fallback: rect intersection with all non-area droppables
      const nonArea = args.droppableContainers.filter((c) => {
        const d = c.data.current as { type?: string } | undefined
        return d?.type !== 'area'
      })
      return rectIntersection({ ...args, droppableContainers: nonArea })
    },
    [activeType, containers]
  )

  // ── Handlers ──

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as { type?: string } | undefined
      const type = data?.type === 'area' ? 'area' : 'task'
      setActiveId(String(event.active.id))
      setActiveType(type)

      if (type === 'task') {
        const containerId = Object.keys(serverContainers).find((key) =>
          serverContainers[key].includes(String(event.active.id))
        )
        originContainerRef.current = containerId ?? null
        setContainers({ ...serverContainers })
      }
    },
    [serverContainers]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (activeType !== 'task') return
      const { active, over } = event
      if (!over) return

      const aId = String(active.id)
      const oId = String(over.id)

      const activeContainer = findContainer(aId)
      let overContainer = findContainer(oId)
      // If over is a container droppable itself (empty section)
      if (!overContainer && containers[oId]) overContainer = oId

      if (!activeContainer || !overContainer || activeContainer === overContainer) return

      setContainers((prev) => {
        const from = [...(prev[activeContainer] ?? [])]
        const to = [...(prev[overContainer!] ?? [])]
        const fromIdx = from.indexOf(aId)
        if (fromIdx === -1) return prev

        from.splice(fromIdx, 1)
        const toIdx = to.indexOf(oId)
        to.splice(toIdx >= 0 ? toIdx : to.length, 0, aId)

        return { ...prev, [activeContainer]: from, [overContainer!]: to }
      })
    },
    [activeType, findContainer, containers]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      // ── Area reorder ──
      if (activeType === 'area') {
        setActiveId(null)
        setActiveType(null)
        if (!over || active.id === over.id) return

        const overData = over.data.current as { type?: string } | undefined
        if (overData?.type !== 'area') return

        const aActiveId = String(active.id).replace('area-', '')
        const aOverId = String(over.id).replace('area-', '')
        const oldIdx = serverAreaOrder.indexOf(aActiveId)
        const newIdx = serverAreaOrder.indexOf(aOverId)
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return

        const newArr = arrayMove(serverAreaOrder, oldIdx, newIdx)
        setLocalAreaOrder(newArr)

        const items = serverAreaOrder.map((id) => ({
          id,
          sort_order: areaGroups.find((g) => g.area.id === id)?.area.sort_order ?? '',
        }))
        const order = calculateNewOrderForArea(items, oldIdx, newIdx)
        areaMutation.mutate({ nodeId: aActiveId, newOrder: order, areaId: aActiveId })
        return
      }

      // ── Task drag end ──
      const taskId = String(active.id)
      setActiveId(null)
      setActiveType(null)

      if (!over) {
        setContainers(serverContainers)
        originContainerRef.current = null
        return
      }

      const currentContainer = findContainer(taskId)
      const originContainer = originContainerRef.current
      originContainerRef.current = null

      if (!currentContainer) {
        setContainers(serverContainers)
        return
      }

      if (currentContainer === originContainer) {
        // ── Within-section reorder ──
        const overIdStr = String(over.id)
        if (overIdStr === currentContainer || taskId === overIdStr) {
          setContainers(serverContainers)
          return
        }

        const items = containers[currentContainer] ?? []
        const oldIndex = items.indexOf(taskId)
        const newIndex = items.indexOf(overIdStr)
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          setContainers(serverContainers)
          return
        }

        const reordered = arrayMove(items, oldIndex, newIndex)
        setContainers((prev) => ({ ...prev, [currentContainer]: reordered }))

        // Compute sort order from neighbors
        const tasksInOrder = reordered
          .map((id) => allTasksMap.get(id))
          .filter(Boolean) as HomeTask[]
        const newPos = reordered.indexOf(taskId)
        const prevTask = newPos > 0 ? tasksInOrder[newPos - 1] : null
        const nextTask = newPos < tasksInOrder.length - 1 ? tasksInOrder[newPos + 1] : null
        const newOrder = safeNewOrderBetween(
          prevTask?.sort_order ?? null,
          nextTask?.sort_order ?? null
        )

        taskReorderMutation.mutate({ taskId, date: dateStr, sortOrder: newOrder })
      } else {
        // ── Cross-section move ──
        let newGoalId: string | null = null
        if (currentContainer !== DAILY_CONTAINER_ID) {
          const goals = areaGoalsMap.get(currentContainer)
          newGoalId = goals?.[0]?.id ?? null

          if (!newGoalId) {
            toast.error('대상 영역에 목표가 없어요.')
            setContainers(serverContainers)
            return
          }
        }

        // Adjust position: onDragOver placed the task, but user may have
        // continued dragging within the container (SortableContext visual only).
        // Use over.id to correct the final position.
        const overIdStr = String(over.id)
        let finalItems = [...(containers[currentContainer] ?? [])]
        if (overIdStr !== currentContainer && overIdStr !== taskId) {
          const curIdx = finalItems.indexOf(taskId)
          const overIdx = finalItems.indexOf(overIdStr)
          if (curIdx !== -1 && overIdx !== -1 && curIdx !== overIdx) {
            finalItems = arrayMove(finalItems, curIdx, overIdx)
          }
        }
        setContainers((prev) => ({ ...prev, [currentContainer]: finalItems }))

        const finalIndex = finalItems.indexOf(taskId)
        const tasksInOrder = finalItems
          .map((id) => allTasksMap.get(id))
          .filter(Boolean) as HomeTask[]
        const prevTask = finalIndex > 0 ? tasksInOrder[finalIndex - 1] : null
        const nextTask = finalIndex < tasksInOrder.length - 1 ? tasksInOrder[finalIndex + 1] : null
        const newOrder = safeNewOrderBetween(
          prevTask?.sort_order ?? null,
          nextTask?.sort_order ?? null
        )

        // Build goalPatch for optimistic UI update
        let goalPatch: HomeTaskDto['goal'] | null = null
        if (newGoalId && currentContainer !== DAILY_CONTAINER_ID) {
          const goals = areaGoalsMap.get(currentContainer)
          const targetGoal = goals?.find((g) => g.id === newGoalId)
          const targetArea = areaGroups.find((g) => g.area.id === currentContainer)?.area
          if (targetGoal && targetArea) {
            goalPatch = {
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
            }
          }
        }

        // Synchronously patch TQ cache BEFORE mutate() so UI updates instantly
        // (onMutate is async — await cancelQueries yields, causing a stale render)
        moveSnapshotRef.current = snapshotHomeCaches(queryClient, dateStr, weekStartStr)
        isMutatingRef.current = true
        patchTaskInHomeCaches(queryClient, dateStr, weekStartStr, taskId, {
          goalId: newGoalId,
          goal: goalPatch ?? null,
          groupId: null,
          areaId: null,
          directArea: null,
          sortOrder: newOrder,
        } as Partial<HomeTaskDto>)

        // Also set local ref patch for getTasksForContainer (DnD container state)
        taskPatchesRef.current.set(taskId, {
          goal_id: newGoalId,
          goal: goalPatch
            ? {
                id: goalPatch.id,
                name: goalPatch.name,
                why: null,
                areaId: goalPatch.areaId,
                area: {
                  id: goalPatch.area.id,
                  name: goalPatch.area.name,
                  emoji: goalPatch.area.emoji,
                  color: goalPatch.area.color,
                  why: null,
                  sort_order: goalPatch.area.sortOrder ?? '',
                },
              }
            : null,
          group_id: null,
          area_id: null,
          directArea: null,
          sort_order: newOrder,
        } as Partial<HomeTask>)

        taskMoveMutation.mutate({
          taskId,
          newGoalId,
          newSortOrder: newOrder,
          date: dateStr,
          goalPatch,
        })
      }
    },
    [
      activeType,
      serverAreaOrder,
      areaGroups,
      areaMutation,
      serverContainers,
      containers,
      findContainer,
      allTasksMap,
      areaGoalsMap,
      dateStr,
      weekStartStr,
      queryClient,
      taskReorderMutation,
      taskMoveMutation,
    ]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setActiveType(null)
    setContainers(serverContainers)
    setLocalAreaOrder(serverAreaOrder)
    originContainerRef.current = null
    taskPatchesRef.current.clear()
  }, [serverContainers, serverAreaOrder])

  // ── Build task lists from containers ──

  const getTasksForContainer = useCallback(
    (containerId: string): HomeTask[] => {
      const ids = containers[containerId] ?? []
      return ids
        .map((id) => {
          const base = allTasksMap.get(id)
          if (!base) return null
          const patch = taskPatchesRef.current.get(id)
          return patch ? { ...base, ...patch } : base
        })
        .filter(Boolean) as HomeTask[]
    },
    [containers, allTasksMap]
  )

  return {
    areaOrder: localAreaOrder,
    getTasksForContainer,
    activeId,
    activeType,
    activeTask,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    collisionDetection,
  }
}

// ── Helpers ──

function calculateNewOrderForArea(
  items: Array<{ id: string; sort_order: string }>,
  fromIndex: number,
  toIndex: number
): string {
  const remaining = items.filter((_, i) => i !== fromIndex)
  if (toIndex <= 0) return safeNewOrderBetween(null, remaining[0]?.sort_order ?? null)
  if (toIndex >= remaining.length)
    return safeNewOrderBetween(remaining[remaining.length - 1]?.sort_order ?? null, null)
  return safeNewOrderBetween(
    remaining[toIndex - 1]?.sort_order ?? null,
    remaining[toIndex]?.sort_order ?? null
  )
}
