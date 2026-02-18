'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDebouncedCallback } from 'use-debounce'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core'
import { getNewOrderBetween as _getNewOrderBetween } from '@/lib/fractional-index'
import { moveNode, type MoveNodeInput } from '@/actions/tree.actions'
import { queryKeys } from '@/lib/query/keys'
import type { HomeTask } from '@/types/entities'
import type { AreaGroup } from '@/lib/utils/task-utils'

function isValidFractionalKey(key: string): boolean {
  return key.length > 0 && key[0] >= 'a' && key[0] <= 'z'
}

function sanitizeKey(key: string | null): string | null {
  if (key == null) return null
  return isValidFractionalKey(key) ? key : null
}

function safeNewOrderBetween(before: string | null, after: string | null): string {
  return _getNewOrderBetween(sanitizeKey(before), sanitizeKey(after))
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

export function useTaskDnd(areaGroups: AreaGroup[], dailyTasks: HomeTask[], selectedDate: Date) {
  const queryClient = useQueryClient()
  const dateStr = format(selectedDate, 'yyyy-MM-dd')

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

  // Previous data for rollback
  const previousDataRef = useRef<unknown>(null)

  // ── Debounced server mutation ──
  const mutation = useMutation({
    mutationFn: moveNode,
    onError: () => {
      if (previousDataRef.current) {
        queryClient.setQueryData(queryKeys.tasks.home(dateStr), previousDataRef.current)
      }
      toast.error('이동에 실패했어요. 다시 시도해주세요.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.home(dateStr) })
    },
  })

  const debouncedMutate = useDebouncedCallback((input: MoveNodeInput) => {
    mutation.mutate(input)
  }, 300)

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
      const overData = over.data.current as { type?: string; containerId?: string } | undefined
      let overContainer: string | undefined

      if (overData?.type === 'container') {
        overContainer = overData.containerId
      } else if (overData?.type === 'task') {
        overContainer = overData.containerId ?? findContainer(overId)
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

            const dateKey = queryKeys.tasks.home(dateStr)
            previousDataRef.current = queryClient.getQueryData(dateKey)
            queryClient.setQueryData<HomeTask[]>(dateKey, (prev) =>
              prev?.map((t) =>
                t.goal?.area?.id === areaId
                  ? {
                      ...t,
                      goal: { ...t.goal!, area: { ...t.goal!.area, sort_order: newSortOrder } },
                    }
                  : t
              )
            )

            debouncedMutate({
              nodeId: areaId,
              nodeType: 'area',
              newOrder: newSortOrder,
            })
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

        const containerIds = taskContainers[currentContainer] ?? []
        const taskIndex = containerIds.indexOf(taskId)
        const newOrder = calculateNewOrder(currentContainer, taskIndex, taskId)

        const dateKey = queryKeys.tasks.home(dateStr)

        // Cross-move detection via dragSourceContainer ref (roadmap pattern)
        if (sourceContainer === currentContainer) {
          // Same container reorder
          previousDataRef.current = queryClient.getQueryData(dateKey)
          queryClient.setQueryData<HomeTask[]>(dateKey, (prev) =>
            prev?.map((t) => (t.id === taskId ? { ...t, sort_order: newOrder } : t))
          )

          debouncedMutate({
            nodeId: taskId,
            nodeType: 'task',
            newOrder,
          })
        } else {
          // Cross-container move
          if (currentContainer === DAILY_CONTAINER) {
            // Moving to daily → goal_id = null
            previousDataRef.current = queryClient.getQueryData(dateKey)
            queryClient.setQueryData<HomeTask[]>(dateKey, (prev) =>
              prev?.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      sort_order: newOrder,
                      goal_id: null,
                      goal: null,
                      group_id: null,
                      group: null,
                    }
                  : t
              )
            )

            debouncedMutate({
              nodeId: taskId,
              nodeType: 'task',
              newOrder,
              newParentId: null,
            })
          } else {
            // Moving to an area — need to determine goal
            const targetAreaGroup = areaGroups.find((g) => g.area.id === currentContainer)
            const goals = targetAreaGroup?.goals ?? []

            if (goals.length === 1) {
              const targetGoal = goals[0]
              const targetArea = targetAreaGroup!.area
              previousDataRef.current = queryClient.getQueryData(dateKey)
              queryClient.setQueryData<HomeTask[]>(dateKey, (prev) =>
                prev?.map((t) =>
                  t.id === taskId
                    ? {
                        ...t,
                        sort_order: newOrder,
                        goal_id: targetGoal.id,
                        goal: {
                          id: targetGoal.id,
                          name: targetGoal.name,
                          why: null,
                          areaId: targetArea.id,
                          area: { ...targetArea, why: null },
                        },
                        group_id: null,
                        group: null,
                      }
                    : t
                )
              )

              debouncedMutate({
                nodeId: taskId,
                nodeType: 'task',
                newOrder,
                newParentId: targetGoal.id,
              })
            } else if (goals.length > 1) {
              // Multiple goals — show picker, keep drag containers frozen for preview
              setPendingCrossMove({
                taskId,
                targetContainerId: currentContainer,
                targetGoals: goals,
                newOrder,
              })
              return
            }
          }
        }

        setDragContainers(null)
        setDragAreaOrder(null)
        return
      }

      setDragContainers(null)
      setDragAreaOrder(null)
    },
    [
      dragContainers,
      dragAreaOrder,
      taskContainers,
      areaGroups,
      findContainer,
      calculateNewOrder,
      queryClient,
      dateStr,
      debouncedMutate,
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

      const dateKey = queryKeys.tasks.home(dateStr)
      previousDataRef.current = queryClient.getQueryData(dateKey)

      const targetAreaGroup = areaGroups.find((g) => g.goals.some((gl) => gl.id === goalId))
      const targetGoal = targetAreaGroup?.goals.find((g) => g.id === goalId)
      const targetArea = targetAreaGroup?.area

      if (targetGoal && targetArea) {
        queryClient.setQueryData<HomeTask[]>(dateKey, (prev) =>
          prev?.map((t) =>
            t.id === pendingCrossMove.taskId
              ? {
                  ...t,
                  sort_order: pendingCrossMove.newOrder,
                  goal_id: goalId,
                  goal: {
                    id: goalId,
                    name: targetGoal.name,
                    why: null,
                    areaId: targetArea.id,
                    area: { ...targetArea, why: null },
                  },
                  group_id: null,
                  group: null,
                }
              : t
          )
        )
      }

      debouncedMutate({
        nodeId: pendingCrossMove.taskId,
        nodeType: 'task',
        newOrder: pendingCrossMove.newOrder,
        newParentId: goalId,
      })

      setPendingCrossMove(null)
      setDragContainers(null)
      setDragAreaOrder(null)
    },
    [pendingCrossMove, queryClient, dateStr, debouncedMutate, areaGroups]
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
