import { useState, useMemo, useCallback, useRef } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent, DragOverEvent, DragStartEvent, UniqueIdentifier } from '@dnd-kit/core'
import { useUpdateTask, useReorderTasks } from '@/queries/use-tasks'
import type { Task, Group } from '@/types/entities'

export const ORPHANS_CONTAINER_ID = '__orphans__'

interface UseCrossGroupDndOptions {
  goalId: string
  groups: Group[]
  tasksByGroup: Map<string | null, Task[]>
  tasksById: Map<string, Task>
  expandedGroupIds: Set<string>
  onExpandGroup: (groupId: string) => void
  onDragStart?: () => void
}

interface UseCrossGroupDndReturn {
  taskContainers: Record<string, string[]>
  activeTaskId: string | null
  activeTask: Task | undefined
  orphanedTaskIds: string[]
  handleTaskDragStart: (event: DragStartEvent) => void
  handleTaskDragOver: (event: DragOverEvent) => void
  handleTaskDragEnd: (event: DragEndEvent) => void
  handleTaskDragCancel: () => void
  reorderTasks: ReturnType<typeof useReorderTasks>
}

export function useCrossGroupDnd({
  goalId,
  groups,
  tasksByGroup,
  tasksById,
  expandedGroupIds,
  onExpandGroup,
  onDragStart,
}: UseCrossGroupDndOptions): UseCrossGroupDndReturn {
  const reorderTasks = useReorderTasks()
  const updateTask = useUpdateTask()

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  // Server-derived containers (always up-to-date from query data)
  const serverContainers = useMemo(() => {
    const containers: Record<string, string[]> = {}
    for (const group of groups) {
      containers[group.id] = (tasksByGroup.get(group.id) ?? []).map((t) => t.id)
    }
    containers[ORPHANS_CONTAINER_ID] = (tasksByGroup.get(null) ?? []).map((t) => t.id)
    return containers
  }, [groups, tasksByGroup])

  // Local override during drag — null means "use server containers"
  const [dragContainers, setDragContainers] = useState<Record<string, string[]> | null>(null)

  // Use local override during drag/mutation, otherwise server data
  const taskContainers = dragContainers ?? serverContainers

  // Ref to track the "source" container when drag started
  const dragSourceContainer = useRef<string | null>(null)

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

  // ── Handlers ──

  const handleTaskDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveTaskId(event.active.id as string)
      // Snapshot current containers into local state for drag manipulation
      setDragContainers({ ...serverContainers })
      dragSourceContainer.current = findContainer(event.active.id) ?? null
      onDragStart?.()
    },
    [findContainer, onDragStart, serverContainers]
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
        onExpandGroup(overContainer)
      }

      setDragContainers((prev) => {
        if (!prev) return prev
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
    [findContainer, taskContainers, expandedGroupIds, onExpandGroup]
  )

  const handleTaskDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveTaskId(null)

      if (!over) {
        dragSourceContainer.current = null
        setDragContainers(null)
        return
      }

      const activeContainer = findContainer(active.id)
      const overContainer = findContainer(over.id) ?? (over.id as string)

      if (!activeContainer || !overContainer) {
        dragSourceContainer.current = null
        setDragContainers(null)
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
          setDragContainers((prev) => (prev ? { ...prev, [activeContainer]: finalItems } : prev))
        }

        if (isCrossMove) {
          // Cross-group move: update group_id first, then reorder on success
          // Keep dragContainers during mutation to prevent flicker
          const targetGroupId = activeContainer === ORPHANS_CONTAINER_ID ? null : activeContainer
          updateTask.mutate(
            { id: active.id as string, input: { group_id: targetGroupId } },
            {
              onSuccess: () =>
                reorderTasks.mutate(
                  { goalId, ids: finalItems },
                  { onSettled: () => setDragContainers(null) }
                ),
              onError: () => setDragContainers(null),
            }
          )
        } else if (finalItems !== items) {
          // Same-group reorder only — keep local state during mutation
          reorderTasks.mutate(
            { goalId, ids: finalItems },
            { onSettled: () => setDragContainers(null) }
          )
        } else {
          // No change — revert to server
          setDragContainers(null)
        }
      } else {
        setDragContainers(null)
      }
    },
    [findContainer, taskContainers, goalId, reorderTasks, updateTask]
  )

  const handleTaskDragCancel = useCallback(() => {
    setActiveTaskId(null)
    dragSourceContainer.current = null
    // Revert to server state
    setDragContainers(null)
  }, [])

  // Derived values
  const activeTask = activeTaskId ? tasksById.get(activeTaskId) : undefined
  const orphanedTaskIds = useMemo(
    () => taskContainers[ORPHANS_CONTAINER_ID] ?? [],
    [taskContainers]
  )

  return {
    taskContainers,
    activeTaskId,
    activeTask,
    orphanedTaskIds,
    handleTaskDragStart,
    handleTaskDragOver,
    handleTaskDragEnd,
    handleTaskDragCancel,
    reorderTasks,
  }
}
