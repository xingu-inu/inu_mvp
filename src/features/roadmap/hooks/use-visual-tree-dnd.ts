'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'
import { moveNode, type NodeType } from '@/actions/tree.actions'
import { getNewOrderBetween } from '@/lib/fractional-index'
import { queryKeys } from '@/lib/query/keys'
import { createTreeCollisionDetection } from '@/lib/dnd/tree-collision-detection'
import type { VisualTreeNode } from '../components/visual-tree/tree-node-card'
import type { Area, Goal } from '@/types/entities'

interface UseVisualTreeDndOptions {
  tree: VisualTreeNode | null
  zoom: number
}

interface DndState {
  activeId: string | null
  activeNode: VisualTreeNode | null
  overId: string | null
}

/** Result from computing the new position after a drop */
interface NewPositionResult {
  nodeType: NodeType
  newSortOrder: string
}

export function useVisualTreeDnd({ tree, zoom }: UseVisualTreeDndOptions) {
  const [dndState, setDndState] = useState<DndState>({
    activeId: null,
    activeNode: null,
    overId: null,
  })
  const isDraggingRef = useRef(false)
  const queryClient = useQueryClient()

  // Custom sensors: 8px activation for pointer (prevent click/drag misfire), no keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // Compute valid drop targets (siblings of dragged node)
  const validTargetIds = useMemo(() => {
    if (!dndState.activeId || !tree) return new Set<string>()
    return findSiblingInsertionIds(tree, dndState.activeId)
  }, [dndState.activeId, tree])

  // Collision detection with zoom compensation
  const collisionDetection = useMemo(
    () => createTreeCollisionDetection({ zoom, validTargetIds }),
    [zoom, validTargetIds]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as { type: string; id: string; node: VisualTreeNode }
    isDraggingRef.current = true
    setDndState({
      activeId: data.id,
      activeNode: data.node,
      overId: null,
    })
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setDndState((prev) => ({
      ...prev,
      overId: (event.over?.id as string) ?? null,
    }))
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      isDraggingRef.current = false
      const { active, over } = event

      if (!over || !tree) {
        setDndState({ activeId: null, activeNode: null, overId: null })
        return
      }

      const draggedId = (active.data.current as { id: string }).id
      const dropId = over.id as string

      try {
        const result = computeNewPosition(tree, draggedId, dropId)
        if (result) {
          const nodeType = result.nodeType

          // Optimistic cache update based on node type
          if (nodeType === 'area') {
            const prevAreas = queryClient.getQueryData<Area[]>(queryKeys.areas.all)
            if (prevAreas) {
              queryClient.setQueryData<Area[]>(
                queryKeys.areas.all,
                prevAreas.map((a) =>
                  a.id === draggedId ? { ...a, sort_order: result.newSortOrder } : a
                )
              )
            }
          } else {
            // goal, group, task — all stored in goals.all cache
            const prevGoals = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)
            if (prevGoals) {
              queryClient.setQueryData<Goal[]>(
                queryKeys.goals.all,
                updateGoalsCacheForReorder(prevGoals, draggedId, nodeType, result.newSortOrder)
              )
            }
          }

          await moveNode({
            nodeId: draggedId,
            nodeType,
            newOrder: result.newSortOrder,
          })
        }
      } catch {
        // Rollback: invalidate queries to refetch from server
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.areas.all })
      }

      setDndState({ activeId: null, activeNode: null, overId: null })
    },
    [tree, queryClient]
  )

  const handleDragCancel = useCallback(() => {
    isDraggingRef.current = false
    setDndState({ activeId: null, activeNode: null, overId: null })
  }, [])

  return {
    sensors,
    collisionDetection,
    dndState,
    isDraggingRef,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Internal Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Find the dragged node's parent, then create insertion point IDs
 * for between each sibling pair.
 * Format: "insert-{index}-{parentId}" where index is the position to insert at.
 */
function findSiblingInsertionIds(tree: VisualTreeNode, draggedId: string): Set<string> {
  const ids = new Set<string>()
  const parent = findParent(tree, draggedId)
  if (!parent || !parent.children) return ids

  const siblings = parent.children
  // Create insertion points: before first, between each pair, after last
  for (let i = 0; i <= siblings.length; i++) {
    ids.add(`insert-${i}-${parent.id}`)
  }

  return ids
}

/**
 * Find the parent node of a given nodeId in the tree.
 */
function findParent(tree: VisualTreeNode, nodeId: string): VisualTreeNode | null {
  if (!tree.children) return null

  for (const child of tree.children) {
    if (child.id === nodeId) return tree
    const found = findParent(child, nodeId)
    if (found) return found
  }

  return null
}

/**
 * Find a node by its ID in the tree.
 */
function findNode(tree: VisualTreeNode, nodeId: string): VisualTreeNode | null {
  if (tree.id === nodeId) return tree
  if (!tree.children) return null

  for (const child of tree.children) {
    const found = findNode(child, nodeId)
    if (found) return found
  }

  return null
}

/**
 * Parse the drop target to determine new position,
 * compute sort_order using getNewOrderBetween.
 *
 * Drop ID format: "insert-{index}-{parentId}"
 */
function computeNewPosition(
  tree: VisualTreeNode,
  draggedId: string,
  dropId: string
): NewPositionResult | null {
  // Parse dropId: "insert-{index}-{parentId}"
  const match = dropId.match(/^insert-(\d+)-(.+)$/)
  if (!match) return null

  const insertIndex = parseInt(match[1], 10)
  const parentId = match[2]

  const parent = findNode(tree, parentId)
  if (!parent || !parent.children) return null

  const draggedNode = findNode(tree, draggedId)
  if (!draggedNode) return null

  // Get siblings excluding the dragged node
  const siblings = parent.children.filter((c) => c.id !== draggedId)

  // Determine the sort_order values of neighbors
  const beforeNode = insertIndex > 0 ? siblings[insertIndex - 1] : null
  const afterNode = insertIndex < siblings.length ? siblings[insertIndex] : null

  // Use sort_order from VisualTreeNode.meta (populated by buildVisualTreeData)
  const beforeOrder = beforeNode?.meta?.sortOrder ?? null
  const afterOrder = afterNode?.meta?.sortOrder ?? null

  const newSortOrder = getNewOrderBetween(beforeOrder, afterOrder)

  const nodeType = mapVisualTypeToNodeType(draggedNode.type)

  return { nodeType, newSortOrder }
}

/**
 * Map VisualTreeNode type to server NodeType.
 */
function mapVisualTypeToNodeType(type: string): NodeType {
  switch (type) {
    case 'direction':
      return 'direction'
    case 'area':
      return 'area'
    case 'goal':
      return 'goal'
    case 'group':
      return 'group'
    case 'task':
      return 'task'
    default:
      return 'task'
  }
}

/**
 * Update goals cache for reorder: update the sort_order of the moved node.
 * For goal: update goal.sort_order directly.
 * For group: update group.sort_order within its parent goal.
 * For task: update task.sort_order within its parent goal.
 */
function updateGoalsCacheForReorder(
  goals: Goal[],
  nodeId: string,
  nodeType: NodeType,
  newSortOrder: string
): Goal[] {
  if (nodeType === 'goal') {
    return goals.map((g) => (g.id === nodeId ? { ...g, sort_order: newSortOrder } : g))
  }

  if (nodeType === 'group') {
    return goals.map((g) => {
      if (!g.groups) return g
      const hasGroup = g.groups.some((gr) => gr.id === nodeId)
      if (!hasGroup) return g
      return {
        ...g,
        groups: g.groups.map((gr) => (gr.id === nodeId ? { ...gr, sort_order: newSortOrder } : gr)),
      }
    })
  }

  if (nodeType === 'task') {
    return goals.map((g) => {
      if (!g.tasks) return g
      const hasTask = g.tasks.some((t) => t.id === nodeId)
      if (!hasTask) return g
      return {
        ...g,
        tasks: g.tasks.map((t) => (t.id === nodeId ? { ...t, sort_order: newSortOrder } : t)),
      }
    })
  }

  return goals
}
