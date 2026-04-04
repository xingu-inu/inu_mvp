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

// ── Internal types ─────────────────────────────────────────────

interface DragState {
  nodeId: string
  nodeType: string
  originalIndex: number
  siblingIds: string[]
  siblingSlots: Map<string, { x: number; y: number }>
  /** Slot positions in spatial order (ascending by axis) */
  slotPositions: { x: number; y: number }[]
  /** Each sibling's sort_order for computing new fractional index */
  sortOrders: Map<string, string | null>
  /** Current target slot (visual position) */
  currentInsertIndex: number
  /** True when ≤1 siblings — drag allowed but no reorder */
  noReorder: boolean
  /** Current parent ID of the dragged node */
  parentId: string | null
  /** ID of the node currently hovered as a drop target */
  dropTargetId: string | null
  /** Set of valid cross-parent drop target IDs (computed at drag start) */
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
  const stateRef = useRef<DragState | null>(null)
  /** Ghost placeholder: original position + measured size at drag start */
  const dragGhostRef = useRef<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  /** Tracks cancelled drags so onNodeDragStop can snap the node back */
  const cancelledRef = useRef<{
    nodeId: string
    position: { x: number; y: number }
  } | null>(null)
  /** Safety net: always save start position so onNodeDragStop can snap back
   *  even when onNodeDragStart returned early without setting stateRef. */
  const dragStartPosRef = useRef<{
    nodeId: string
    position: { x: number; y: number }
  } | null>(null)

  // ── Drag start ─────────────────────────────────────────────

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: WhyMapNode) => {
      // Always save start position for snap-back safety net
      dragStartPosRef.current = {
        nodeId: node.id,
        position: { x: node.position.x, y: node.position.y },
      }

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

      // Sort by spatial position on the reorder axis (what the user sees)
      const axis = directionRef.current === 'TB' ? 'x' : 'y'
      siblingNodes.sort((a, b) => a.position[axis] - b.position[axis])

      const siblingIds = siblingNodes.map((n) => n.id)
      const originalIndex = siblingIds.indexOf(node.id)

      // Save dagre-computed positions as reorder slots (already sorted by axis)
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
      const currentParentId = parentEdge.source

      // Capture ghost position + size at drag start
      dragGhostRef.current = {
        x: node.position.x,
        y: node.position.y,
        width: node.measured?.width ?? 200,
        height: node.measured?.height ?? 60,
      }

      // ≤1 sibling → no reorder target, but still track for snap-back
      if (siblingIds.length <= 1 || originalIndex === -1) {
        stateRef.current = {
          nodeId: node.id,
          nodeType: node.type ?? 'goal',
          originalIndex: 0,
          siblingIds,
          siblingSlots,
          slotPositions,
          sortOrders,
          currentInsertIndex: 0,
          noReorder: true,
          parentId: currentParentId,
          dropTargetId: null,
          validDropTargets: validDropTargetIds,
        }
        setDraggingNodeId(node.id)
        return
      }

      stateRef.current = {
        nodeId: node.id,
        nodeType: node.type ?? 'goal',
        originalIndex,
        siblingIds,
        siblingSlots,
        slotPositions,
        sortOrders,
        currentInsertIndex: originalIndex,
        noReorder: false,
        parentId: currentParentId,
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
      const s = stateRef.current
      if (!s) return

      // ── Cross-parent drop target detection ──
      // Check proximity to valid drop targets regardless of noReorder
      const curNodes = nodesRef.current
      const DROP_THRESHOLD = 100 // px
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

        // Bounding box distance (0 if overlapping)
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
      if (s.noReorder || newDropTarget) return

      // TB layout: siblings spread on x-axis; LR layout: y-axis
      const axis = directionRef.current === 'TB' ? 'x' : 'y'
      const dragPos = node.position[axis]
      const positions = s.slotPositions.map((p) => p[axis])

      // Determine target slot via midpoint thresholds
      // Positions are sorted ascending (spatial order), so scan all midpoints
      let targetSlot = 0
      for (let i = 0; i < positions.length - 1; i++) {
        if (dragPos > (positions[i] + positions[i + 1]) / 2) {
          targetSlot = i + 1
        }
      }

      if (targetSlot === s.currentInsertIndex) return
      s.currentInsertIndex = targetSlot

      // Update reorder indicator for visual gap line
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
      // Handle cancelled drag: snap node back on mouse release
      // Always clear indicator on drag stop
      setReorderIndicator(null)

      const cancelled = cancelledRef.current
      if (cancelled?.nodeId === node.id) {
        setNodes((ns) =>
          ns.map((n) =>
            n.id === node.id ? ({ ...n, position: cancelled.position } as WhyMapNode) : n
          )
        )
        cancelledRef.current = null
        dragStartPosRef.current = null
        return
      }

      const s = stateRef.current
      if (!s) {
        // Safety net: snap node back to start position if drag started
        // but no reorder state was created (e.g. editing mode, no parent edge)
        const startPos = dragStartPosRef.current
        if (startPos?.nodeId === node.id) {
          setNodes((ns) =>
            ns.map((n) =>
              n.id === node.id ? ({ ...n, position: startPos.position } as WhyMapNode) : n
            )
          )
        }
        dragStartPosRef.current = null
        return
      }

      const { nodeType, dropTargetId: finalDropTarget, parentId: currentParentId } = s

      // ── Cross-parent drop ──────────────────────────────────────
      if (finalDropTarget && finalDropTarget !== currentParentId) {
        // Clean up visual state
        setNodes((ns) =>
          ns.map((n) => {
            if (s.siblingIds.includes(n.id)) {
              return {
                ...n,
                className: removeClassName(n.className, 'reordering'),
              } as WhyMapNode
            }
            return n
          })
        )

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

        // Clear drag state before async server call
        stateRef.current = null
        dragStartPosRef.current = null
        dragGhostRef.current = null
        setDraggingNodeId(null)
        setDropTargetId(null)

        // Persist to server
        const keyMap: Record<string, readonly string[]> = {
          area: queryKeys.areas.all,
          goal: queryKeys.goals.all,
          group: queryKeys.groups.all,
          task: queryKeys.tasks.all,
        }
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
          // Invalidate both old and new parent type caches + the node's own type
          const keysToInvalidate = new Set<readonly string[]>()
          keysToInvalidate.add(keyMap[nodeType] ?? queryKeys.goals.all)
          // Find old parent type and new parent type for cache invalidation
          const oldParentNode = curNodes.find((n) => n.id === currentParentId)
          const newParentNode = curNodes.find((n) => n.id === finalDropTarget)
          if (oldParentNode?.type)
            keysToInvalidate.add(keyMap[oldParentNode.type] ?? queryKeys.goals.all)
          if (newParentNode?.type)
            keysToInvalidate.add(keyMap[newParentNode.type] ?? queryKeys.goals.all)

          await Promise.all([
            ...Array.from(keysToInvalidate).map((k) =>
              queryClient.invalidateQueries({ queryKey: k })
            ),
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.roadmap }),
          ])
          relayout()
        }
        return
      }

      // ── Sibling reorder (no cross-parent target) ──────────────

      // Clear drop target if it was set
      if (s.dropTargetId) {
        setDropTargetId(null)
      }

      // No change or can't reorder → snap back to original position
      if (s.noReorder || s.currentInsertIndex === s.originalIndex) {
        const origPos = s.siblingSlots.get(node.id)
        setNodes((ns) =>
          ns.map((n) => {
            if (n.id === node.id && origPos) {
              return {
                ...n,
                position: origPos,
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
        stateRef.current = null
        dragStartPosRef.current = null
        setDraggingNodeId(null)
        return
      }

      // Snap dragged node to target slot + clear reordering class from all siblings
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

      // Compute new fractional sort_order from neighbors in the new visual order
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

      // Clear drag state before async server call
      stateRef.current = null
      dragStartPosRef.current = null
      dragGhostRef.current = null
      setDraggingNodeId(null)

      // Persist to server — always invalidate so UI converges to server truth
      const keyMap: Record<string, readonly string[]> = {
        area: queryKeys.areas.all,
        goal: queryKeys.goals.all,
        group: queryKeys.groups.all,
        task: queryKeys.tasks.all,
      }
      const key = keyMap[nodeType] ?? queryKeys.goals.all
      try {
        await moveNode({
          nodeId: node.id,
          nodeType: nodeType as NodeType,
          newOrder,
        })
      } catch (error) {
        // Network/auth error — refetch below restores correct state
        if (process.env.NODE_ENV === 'development') {
          console.warn('[DnD] moveNode failed:', error)
        }
      } finally {
        // Wait for refetch to complete, then force dagre relayout for uniform spacing
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: key }),
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.roadmap }),
        ])
        relayout()
      }
    },
    [setNodes, setDraggingNodeId, setDropTargetId, queryClient, relayout]
  )

  // ── Cancel (Escape key) ────────────────────────────────────

  const cancelDrag = useCallback(() => {
    const s = stateRef.current
    if (!s) return

    // Save position so onNodeDragStop can snap the drag node back
    const origPos = s.siblingSlots.get(s.nodeId)
    if (origPos) {
      cancelledRef.current = { nodeId: s.nodeId, position: origPos }
    }

    // Restore sibling positions + clean reordering class (including dragged node)
    setNodes((ns) =>
      ns.map((n) => {
        if (n.id === s.nodeId) {
          return {
            ...n,
            className: removeClassName(n.className, 'reordering'),
          } as WhyMapNode
        }
        const slot = s.siblingSlots.get(n.id)
        if (slot) {
          return {
            ...n,
            position: slot,
            className: removeClassName(n.className, 'reordering'),
          } as WhyMapNode
        }
        return n
      })
    )

    stateRef.current = null
    dragStartPosRef.current = null
    dragGhostRef.current = null
    setReorderIndicator(null)
    setDraggingNodeId(null)
    setDropTargetId(null)
  }, [setNodes, setDraggingNodeId, setDropTargetId])

  return { onNodeDragStart, onNodeDrag, onNodeDragStop, cancelDrag, dragGhostRef, reorderIndicator }
}
