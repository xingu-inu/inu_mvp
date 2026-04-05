'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { WhyMapNode, WhyMapEdge } from './types'
import { moveNode, type NodeType } from '@/actions/tree.actions'
import { safeNewOrderBetween } from '@/lib/fractional-index'
import { queryKeys } from '@/lib/query/keys'
import { getValidDropTargets } from './dnd/hierarchy-rules'

// ── Helpers ────────────────────────────────────────────────────

function addClassName(existing: string | undefined, cls: string): string {
  if (!existing) return cls
  return existing.includes(cls) ? existing : `${existing} ${cls}`
}

function removeClassName(existing: string | undefined, cls: string): string | undefined {
  if (!existing) return undefined
  const result = existing.replace(new RegExp(`\\b${cls}\\b`, 'g'), '').trim()
  return result || undefined
}

/** Remove 'reordering' class from all sibling nodes */
function clearReorderingClass(
  setNodes: React.Dispatch<React.SetStateAction<WhyMapNode[]>>,
  siblingIds: string[]
) {
  setNodes((ns) =>
    ns.map((n) =>
      siblingIds.includes(n.id)
        ? ({ ...n, className: removeClassName(n.className, 'reordering') } as WhyMapNode)
        : n
    )
  )
}

/** Invalidate query caches after a move operation */
async function invalidateMoveCache(
  queryClient: ReturnType<typeof useQueryClient>,
  nodeType: string,
  extraNodeTypes?: string[]
) {
  const keyMap: Record<string, readonly string[]> = {
    area: queryKeys.areas.all,
    goal: queryKeys.goals.all,
    group: queryKeys.groups.all,
    task: queryKeys.tasks.all,
  }
  const keysToInvalidate = new Set<readonly string[]>()
  keysToInvalidate.add(keyMap[nodeType] ?? queryKeys.goals.all)
  for (const t of extraNodeTypes ?? []) {
    if (t) keysToInvalidate.add(keyMap[t] ?? queryKeys.goals.all)
  }

  await Promise.all([
    ...Array.from(keysToInvalidate).map((k) => queryClient.invalidateQueries({ queryKey: k })),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.roadmap }),
  ])
}

// ── Internal types ─────────────────────────────────────────────

interface DragState {
  nodeId: string
  nodeType: string
  startPosition: { x: number; y: number }
  ghost: { x: number; y: number; width: number; height: number }
  cancelled: boolean
  // Sibling reorder
  originalIndex: number
  siblingIds: string[]
  siblingSlots: Map<string, { x: number; y: number }>
  slotPositions: { x: number; y: number }[]
  sortOrders: Map<string, string | null>
  currentInsertIndex: number
  canReorder: boolean
  // Cross-parent drop
  parentId: string | null
  dropTargetId: string | null
  validDropTargets: Set<string>
}

export interface ReorderIndicator {
  slotPositions: { x: number; y: number }[]
  insertIndex: number
  direction: 'TB' | 'LR'
  visible: boolean
}

// ── Hook interface ─────────────────────────────────────────────

interface UseCanvasReorderOptions {
  nodes: WhyMapNode[]
  edges: WhyMapEdge[]
  direction: 'TB' | 'LR'
  setNodes: React.Dispatch<React.SetStateAction<WhyMapNode[]>>
  setDraggingNodeId: (id: string | null) => void
  setDropTargetId: (id: string | null) => void
  editingNodeId: string | null
  relayout: () => void
}

// ── Hook ───────────────────────────────────────────────────────

export function useCanvasReorder({
  nodes,
  edges,
  direction,
  setNodes,
  setDraggingNodeId,
  setDropTargetId,
  editingNodeId,
  relayout,
}: UseCanvasReorderOptions) {
  const queryClient = useQueryClient()

  // Stable refs — avoid stale closures in drag callbacks
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const directionRef = useRef(direction)
  const editingRef = useRef(editingNodeId)

  // Intentionally no deps — sync refs after every render to avoid stale closures
  // in drag callbacks. Direct ref assignment during render is blocked by react-hooks/refs.
  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
    directionRef.current = direction
    editingRef.current = editingNodeId
  })

  const [reorderIndicator, setReorderIndicator] = useState<ReorderIndicator | null>(null)
  const dragRef = useRef<DragState | null>(null)

  // ── Cleanup helper ──────────────────────────────────────────

  const resetDragState = useCallback(() => {
    dragRef.current = null
    setReorderIndicator(null)
    setDraggingNodeId(null)
    setDropTargetId(null)
  }, [setDraggingNodeId, setDropTargetId])

  // ── Drag start ─────────────────────────────────────────────

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: WhyMapNode) => {
      // Direction is unique — no reorder possible
      if (node.type === 'direction') return
      // Block drag during inline editing
      if (editingRef.current) return

      const curEdges = edgesRef.current
      const curNodes = nodesRef.current

      // Find parent via hierarchy edge
      const parentEdge = curEdges.find(
        (e) => e.target === node.id && e.data?.edgeType === 'hierarchy'
      )
      if (!parentEdge) return

      // Collect siblings (all children of the same parent)
      const siblingNodes = curEdges
        .filter((e) => e.source === parentEdge.source && e.data?.edgeType === 'hierarchy')
        .map((e) => curNodes.find((n) => n.id === e.target))
        .filter((n): n is WhyMapNode => n != null)

      // Sort by sort_order so sibling order matches the logical (persisted) sequence
      siblingNodes.sort((a, b) => {
        const aOrder = a.data.treeNode.meta?.sortOrder ?? ''
        const bOrder = b.data.treeNode.meta?.sortOrder ?? ''
        return aOrder.localeCompare(bOrder)
      })

      const siblingIds = siblingNodes.map((n) => n.id)
      const originalIndex = siblingIds.indexOf(node.id)

      // Save dagre-computed positions as reorder slots
      const siblingSlots = new Map<string, { x: number; y: number }>()
      for (const sn of siblingNodes) {
        siblingSlots.set(sn.id, { x: sn.position.x, y: sn.position.y })
      }
      const slotPositions = siblingIds.map((id) => siblingSlots.get(id)!)

      // Store each sibling's sort_order for computing new fractional index on drop
      const sortOrders = new Map<string, string | null>()
      for (const sn of siblingNodes) {
        sortOrders.set(sn.id, sn.data.treeNode.meta?.sortOrder ?? null)
      }

      // Compute valid cross-parent drop targets
      const validTargets = getValidDropTargets(node, curNodes, curEdges)
      const validDropTargetIds = new Set(validTargets.map((n) => n.id))

      dragRef.current = {
        nodeId: node.id,
        nodeType: node.type ?? 'goal',
        startPosition: { x: node.position.x, y: node.position.y },
        ghost: {
          x: node.position.x,
          y: node.position.y,
          width: node.measured?.width ?? 200,
          height: node.measured?.height ?? 60,
        },
        cancelled: false,
        originalIndex: Math.max(0, originalIndex),
        siblingIds,
        siblingSlots,
        slotPositions,
        sortOrders,
        currentInsertIndex: Math.max(0, originalIndex),
        canReorder: siblingIds.length > 1 && originalIndex !== -1,
        parentId: parentEdge.source,
        dropTargetId: null,
        validDropTargets: validDropTargetIds,
      }

      setDraggingNodeId(node.id)
    },
    [setDraggingNodeId]
  )

  // ── Drag move ──────────────────────────────────────────────

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: WhyMapNode) => {
      const s = dragRef.current
      if (!s) return

      // ── Cross-parent drop target detection ──
      const curNodes = nodesRef.current
      const DROP_THRESHOLD = 100
      const dragCenterX = node.position.x + (node.measured?.width ?? 200) / 2
      const dragCenterY = node.position.y + (node.measured?.height ?? 60) / 2

      let closestId: string | null = null
      let closestDist = Infinity

      for (const targetId of s.validDropTargets) {
        const targetNode = curNodes.find((n) => n.id === targetId)
        if (!targetNode) continue

        const tw = targetNode.measured?.width ?? 200
        const th = targetNode.measured?.height ?? 60
        const tcx = targetNode.position.x + tw / 2
        const tcy = targetNode.position.y + th / 2

        const dx = Math.max(0, Math.abs(dragCenterX - tcx) - tw / 2)
        const dy = Math.max(0, Math.abs(dragCenterY - tcy) - th / 2)
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < closestDist) {
          closestDist = dist
          closestId = targetId
        }
      }

      const newDropTarget = closestDist <= DROP_THRESHOLD ? closestId : null
      if (newDropTarget !== s.dropTargetId) {
        s.dropTargetId = newDropTarget
        setDropTargetId(newDropTarget)
      }

      // ── Sibling reorder (only when no cross-parent target active) ──
      if (!s.canReorder || newDropTarget) return

      const axis = directionRef.current === 'TB' ? 'x' : 'y'
      const dragPos = node.position[axis]
      const positions = s.slotPositions.map((p) => p[axis])

      let targetSlot = 0
      for (let i = 0; i < positions.length - 1; i++) {
        if (dragPos > (positions[i] + positions[i + 1]) / 2) {
          targetSlot = i + 1
        }
      }

      if (targetSlot === s.currentInsertIndex) return
      s.currentInsertIndex = targetSlot

      setReorderIndicator({
        slotPositions: s.slotPositions,
        insertIndex: targetSlot,
        direction: directionRef.current,
        visible: true,
      })

      // Build visual order: remove from original slot, insert at target slot
      const newOrder = [...s.siblingIds]
      newOrder.splice(s.originalIndex, 1)
      newOrder.splice(targetSlot, 0, s.nodeId)

      // Swap sibling positions to match visual order (drag node untouched)
      setNodes((ns) =>
        ns.map((n) => {
          const idx = newOrder.indexOf(n.id)
          if (idx === -1 || n.id === s.nodeId) return n
          return {
            ...n,
            position: s.slotPositions[idx],
            className: addClassName(n.className, 'reordering'),
          } as WhyMapNode
        })
      )
    },
    [setNodes, setDropTargetId]
  )

  // ── Drag stop ──────────────────────────────────────────────

  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: WhyMapNode) => {
      setReorderIndicator(null)

      const s = dragRef.current
      if (!s) {
        // No drag state = early return in onNodeDragStart (e.g. editing mode).
        // React Flow may still displace the node; trigger relayout to restore position.
        relayout()
        return
      }

      // Handle cancelled drag — snap back
      if (s.cancelled) {
        setNodes((ns) =>
          ns.map((n) =>
            n.id === node.id ? ({ ...n, position: s.startPosition } as WhyMapNode) : n
          )
        )
        resetDragState()
        return
      }

      const { nodeType, dropTargetId: finalDropTarget, parentId: currentParentId } = s

      // ── Cross-parent drop ──────────────────────────────────────
      if (finalDropTarget && finalDropTarget !== currentParentId) {
        clearReorderingClass(setNodes, s.siblingIds)

        // Compute sort_order: append after the last child of the new parent
        const curEdges = edgesRef.current
        const curNodes = nodesRef.current
        const newParentChildIds = curEdges
          .filter((e) => e.source === finalDropTarget && e.data?.edgeType === 'hierarchy')
          .map((e) => e.target)
        const childSortOrders = newParentChildIds
          .map((cid) => {
            const cn = curNodes.find((n) => n.id === cid)
            return cn?.data?.treeNode?.meta?.sortOrder ?? null
          })
          .filter((o): o is string => o != null)
          .sort()
        const lastOrder =
          childSortOrders.length > 0 ? childSortOrders[childSortOrders.length - 1] : null
        const newOrder = safeNewOrderBetween(lastOrder, null)

        // Determine parent node types for cache invalidation
        const oldParentType = curNodes.find((n) => n.id === currentParentId)?.type
        const newParentType = curNodes.find((n) => n.id === finalDropTarget)?.type

        resetDragState()

        try {
          await moveNode({
            nodeId: node.id,
            nodeType: nodeType as NodeType,
            newOrder,
            newParentId: finalDropTarget,
          })
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[DnD] cross-parent moveNode failed:', error)
          }
        } finally {
          await invalidateMoveCache(
            queryClient,
            nodeType,
            [oldParentType, newParentType].filter(Boolean) as string[]
          )
          relayout()
        }
        return
      }

      // ── Sibling reorder ───────────────────────────────────────

      // No change or can't reorder → snap back
      if (!s.canReorder || s.currentInsertIndex === s.originalIndex) {
        const origPos = s.siblingSlots.get(node.id)
        if (origPos) {
          setNodes((ns) =>
            ns.map((n) => (n.id === node.id ? ({ ...n, position: origPos } as WhyMapNode) : n))
          )
        }
        clearReorderingClass(setNodes, s.siblingIds)
        resetDragState()
        return
      }

      // Snap dragged node to target slot + clear reordering class
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id === node.id) {
            return {
              ...n,
              position: s.slotPositions[s.currentInsertIndex],
              className: removeClassName(n.className, 'reordering'),
            } as WhyMapNode
          }
          if (s.siblingIds.includes(n.id)) {
            return {
              ...n,
              className: removeClassName(n.className, 'reordering'),
            } as WhyMapNode
          }
          return n
        })
      )

      // Compute new fractional sort_order
      const newVisualOrder = [...s.siblingIds]
      newVisualOrder.splice(s.originalIndex, 1)
      newVisualOrder.splice(s.currentInsertIndex, 0, s.nodeId)

      const leftId = s.currentInsertIndex > 0 ? newVisualOrder[s.currentInsertIndex - 1] : null
      const rightId =
        s.currentInsertIndex < newVisualOrder.length - 1
          ? newVisualOrder[s.currentInsertIndex + 1]
          : null

      const leftOrder = leftId ? (s.sortOrders.get(leftId) ?? null) : null
      const rightOrder = rightId ? (s.sortOrders.get(rightId) ?? null) : null
      const newOrder = safeNewOrderBetween(leftOrder, rightOrder)

      resetDragState()

      try {
        await moveNode({
          nodeId: node.id,
          nodeType: nodeType as NodeType,
          newOrder,
        })
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[DnD] moveNode failed:', error)
        }
      } finally {
        await invalidateMoveCache(queryClient, nodeType)
        relayout()
      }
    },
    [setNodes, resetDragState, queryClient, relayout]
  )

  // ── Cancel (Escape key) ────────────────────────────────────

  const cancelDrag = useCallback(() => {
    const s = dragRef.current
    if (!s) return

    // Mark as cancelled — onNodeDragStop will snap back
    s.cancelled = true

    // Restore sibling positions immediately
    setNodes((ns) =>
      ns.map((n) => {
        const slot = s.siblingSlots.get(n.id)
        if (!slot) return n
        return {
          ...n,
          position: n.id === s.nodeId ? n.position : slot,
          className: removeClassName(n.className, 'reordering'),
        } as WhyMapNode
      })
    )

    setReorderIndicator(null)
    setDropTargetId(null)
  }, [setNodes, setDropTargetId])

  // Expose ghost data as a value (re-evaluated when draggingNodeId triggers re-render)
  const dragGhost = dragRef.current?.ghost ?? null

  return { onNodeDragStart, onNodeDrag, onNodeDragStop, cancelDrag, dragGhost, reorderIndicator }
}
