'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { useReactFlow, type Node as RfNode } from '@xyflow/react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { moveNode, type NodeType } from '@/actions/tree.actions'
import { safeNewOrderBetween } from '@/lib/fractional-index'
import { queryKeys } from '@/lib/query/keys'

import type { WhyMapNode, WhyMapEdge } from './types'
import { getValidDropTargets } from './dnd/hierarchy-rules'
import {
  computeInsertIndex,
  boundingSiblings,
  isNoOpSiblingDrop,
  isNoOpSiblingDropByIds,
} from './dnd/sibling-insertion'
import {
  patchMoveInCaches,
  rollbackMovePatch,
  type MoveNodeType,
  type MoveOptimisticInput,
  type CacheSnapshot,
} from './dnd/patch-move-in-caches'

// ── Types exposed to consumers ────────────────────────────────

/** Metadata the indicator needs to render an insertion line between siblings. */
export interface ReorderIndicator {
  slotPositions: { x: number; y: number }[]
  insertIndex: number
  direction: 'TB' | 'LR'
  visible: boolean
}

// ── Internal drag state ───────────────────────────────────────

interface SiblingSlot {
  id: string
  /**
   * Center x/y of the sibling at drag start (stable for the duration of the drag).
   * Used both for drop-target distance math AND for drawing the insertion indicator
   * line between adjacent siblings (indicator expects card centers).
   */
  center: { x: number; y: number }
  sortOrder: string | null
}

interface DragState {
  nodeId: string
  nodeType: NodeType
  /** Parent id on the hierarchy edge (e.g. a goal's area). */
  parentId: string | null
  /** Siblings (excluding dragged) in sort_order with frozen positions. */
  siblings: SiblingSlot[]
  /** Full siblingIds array (including dragged) preserved in sort_order. */
  siblingIds: string[]
  /** The dragged node's starting position so cancel can snap back. */
  startPosition: { x: number; y: number }
  /** Ghost (frozen silhouette at original position). */
  ghost: { x: number; y: number; width: number; height: number }
  /** Current cross-parent drop target id (null when hovering among siblings). */
  dropTargetId: string | null
  /** Set of valid drop target ids (cached at drag start). */
  validDropTargetIds: Set<string>
  /**
   * Current live insert index among siblings (computed in onNodeDrag).
   * NOTE: this is in "others space" — [0, siblings.length] — NOT the full
   * siblingIds space. The drop-stop path recomputes it defensively before
   * use to avoid stale values after cross-parent hover paths.
   *
   * At drag start this is seeded to the dragged node's full-space index,
   * which happens to coincide with its others-space slot (same integer k),
   * and is overwritten on the first onNodeDrag event anyway.
   */
  insertIndex: number
  /** Was the drag cancelled via Esc? */
  cancelled: boolean
  /** Width/height of the dragged card for intersection rect calculations. */
  size: { width: number; height: number }
  /**
   * The dragged node's sort_order captured at drag start. Used by
   * onNodeDragStop to detect no-op drops via sort_order comparison instead
   * of index arithmetic (which previously conflated full-space and
   * others-space indices).
   */
  draggedSortOrder: string | null
  /**
   * Latest value pushed to `setInvalidHoverId` — mirrored here so onNodeDrag
   * can bail out of redundant setState calls in the same frame. Matches the
   * pattern used for `dropTargetId`.
   */
  invalidHoverId: string | null
}

// ── Hook interface ────────────────────────────────────────────

interface UseCanvasReorderOptions {
  nodes: WhyMapNode[]
  edges: WhyMapEdge[]
  direction: 'TB' | 'LR'
  setNodes: React.Dispatch<React.SetStateAction<WhyMapNode[]>>
  /**
   * All `set*` callbacks below MUST be referentially stable across renders
   * (pass a `useState` setter or wrap in `useCallback`). They feed into
   * `useCallback` dependency arrays for the drag handlers — if they change
   * identity mid-drag, React Flow re-registers stale handlers and the
   * captured `dragRef` state becomes orphaned.
   */
  setDraggingNodeId: (id: string | null) => void
  setDropTargetId: (id: string | null) => void
  /**
   * Mark a node as "drag hovered but hierarchy-invalid" so the UI can paint
   * a red ring + not-allowed cursor. Null clears the feedback.
   */
  setInvalidHoverId: (id: string | null) => void
  editingNodeId: string | null
  relayout: () => void
}

// ── Helpers ──────────────────────────────────────────────────

/** Build a Map<nodeId, node> from an array — O(n) once instead of repeated finds. */
function toNodeMap(nodes: WhyMapNode[]): Map<string, WhyMapNode> {
  return new Map(nodes.map((n) => [n.id, n]))
}

/** Fallback node dimensions when `measured` hasn't landed yet. */
const FALLBACK_WIDTH = 200
const FALLBACK_HEIGHT = 60

function getNodeSize(node: WhyMapNode): { width: number; height: number } {
  return {
    width: node.measured?.width ?? FALLBACK_WIDTH,
    height: node.measured?.height ?? FALLBACK_HEIGHT,
  }
}

function getNodeCenter(node: WhyMapNode): { x: number; y: number } {
  const { width, height } = getNodeSize(node)
  return { x: node.position.x + width / 2, y: node.position.y + height / 2 }
}

/**
 * Find the parent-goal id of a group. Used to correctly fill the `newParentId`
 * (goal_id) field when a task is dropped onto a group.
 */
function getGroupParentGoalId(groupId: string, edges: WhyMapEdge[]): string | null {
  const e = edges.find((edge) => edge.target === groupId && edge.data?.edgeType === 'hierarchy')
  return e?.source ?? null
}

/**
 * Resolve a drop target to `{newParentId, targetGroupId}` for moveNode.
 * - goal dropped on area: parentId = area.id, groupId ignored
 * - group dropped on goal: parentId = goal.id, groupId ignored
 * - task dropped on goal: parentId = goal.id, targetGroupId = null
 * - task dropped on group: parentId = group's parent goal, targetGroupId = group.id
 */
function resolveDropTarget(
  dragType: NodeType,
  target: WhyMapNode,
  edges: WhyMapEdge[]
): { newParentId: string; targetGroupId: string | null } | null {
  if (dragType === 'task' && target.type === 'group') {
    const goalId = getGroupParentGoalId(target.id, edges)
    if (!goalId) return null
    return { newParentId: goalId, targetGroupId: target.id }
  }
  if (dragType === 'task' && target.type === 'goal') {
    return { newParentId: target.id, targetGroupId: null }
  }
  if (dragType === 'group' && target.type === 'goal') {
    return { newParentId: target.id, targetGroupId: null }
  }
  if (dragType === 'goal' && target.type === 'area') {
    return { newParentId: target.id, targetGroupId: null }
  }
  return null
}

/** Compute how much of a.bbox overlaps with b.bbox. 0 = no overlap. */
function overlapArea(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): number {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const w = Math.min(a.x + a.width, b.x + b.width) - x
  const h = Math.min(a.y + a.height, b.y + b.height) - y
  if (w <= 0 || h <= 0) return 0
  return w * h
}

/** Get the children of a parent (hierarchy), sorted by sort_order. */
function getChildrenInOrder(
  parentId: string,
  nodeMap: Map<string, WhyMapNode>,
  edges: WhyMapEdge[]
): WhyMapNode[] {
  const children: WhyMapNode[] = []
  for (const e of edges) {
    if (e.data?.edgeType !== 'hierarchy') continue
    if (e.source !== parentId) continue
    const child = nodeMap.get(e.target)
    if (child) children.push(child)
  }
  children.sort((a, b) => {
    const ao = a.data?.treeNode?.meta?.sortOrder ?? ''
    const bo = b.data?.treeNode?.meta?.sortOrder ?? ''
    return ao.localeCompare(bo)
  })
  return children
}

// ── Hook ─────────────────────────────────────────────────────

export function useCanvasReorder({
  nodes,
  edges,
  direction,
  setNodes,
  setDraggingNodeId,
  setDropTargetId,
  setInvalidHoverId,
  editingNodeId,
  relayout,
}: UseCanvasReorderOptions) {
  const queryClient = useQueryClient()
  const { getIntersectingNodes } = useReactFlow<WhyMapNode, WhyMapEdge>()

  // Stable refs to avoid stale closures in drag callbacks.
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const directionRef = useRef(direction)
  const editingRef = useRef(editingNodeId)

  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
    directionRef.current = direction
    editingRef.current = editingNodeId
  })

  const [reorderIndicator, setReorderIndicator] = useState<ReorderIndicator | null>(null)
  const [dragGhost, setDragGhost] = useState<DragState['ghost'] | null>(null)
  const dragRef = useRef<DragState | null>(null)

  const resetDragState = useCallback(() => {
    dragRef.current = null
    setReorderIndicator(null)
    setDragGhost(null)
    setDraggingNodeId(null)
    setDropTargetId(null)
    setInvalidHoverId(null)
  }, [setDraggingNodeId, setDropTargetId, setInvalidHoverId])

  // ── Drag start ─────────────────────────────────────────────

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: WhyMapNode) => {
      if (node.type === 'direction') return
      if (editingRef.current) return

      const curEdges = edgesRef.current
      const curNodes = nodesRef.current
      const nodeMap = toNodeMap(curNodes)

      // Find parent via hierarchy edge
      const parentEdge = curEdges.find(
        (e) => e.target === node.id && e.data?.edgeType === 'hierarchy'
      )
      if (!parentEdge) return

      const parentId = parentEdge.source
      const siblingNodes = getChildrenInOrder(parentId, nodeMap, curEdges)
      const siblingIds = siblingNodes.map((n) => n.id)

      // Freeze sibling positions (siblings do NOT move during drag — this is
      // the core fix for the "siblings flying around" pain point).
      const siblings: SiblingSlot[] = siblingNodes
        .filter((s) => s.id !== node.id)
        .map((s) => ({
          id: s.id,
          center: getNodeCenter(s),
          sortOrder: s.data?.treeNode?.meta?.sortOrder ?? null,
        }))

      const validTargets = getValidDropTargets(node, curNodes, curEdges)
      const validDropTargetIds = new Set(validTargets.map((n) => n.id))

      const size = getNodeSize(node)

      const ghost = { x: node.position.x, y: node.position.y, ...size }

      dragRef.current = {
        nodeId: node.id,
        nodeType: node.type as NodeType,
        parentId,
        siblings,
        siblingIds,
        startPosition: { x: node.position.x, y: node.position.y },
        ghost,
        dropTargetId: null,
        validDropTargetIds,
        insertIndex: Math.max(0, siblingIds.indexOf(node.id)),
        cancelled: false,
        size,
        draggedSortOrder: node.data?.treeNode?.meta?.sortOrder ?? null,
        invalidHoverId: null,
      }

      setDragGhost(ghost)
      setDraggingNodeId(node.id)
    },
    [setDraggingNodeId]
  )

  // ── Drag move ──────────────────────────────────────────────

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: WhyMapNode) => {
      const s = dragRef.current
      if (!s) return

      // ── Cross-parent drop target detection via getIntersectingNodes ──
      // We let React Flow tell us which nodes the drag card overlaps (viewport-
      // transform and zoom-aware). Among those, pick the best valid target by
      // overlap area — ties go to the most-deeply intersecting card.
      const size = s.size
      const dragRect = {
        x: node.position.x,
        y: node.position.y,
        width: size.width,
        height: size.height,
      }

      const intersections = getIntersectingNodes(
        { id: node.id } as Pick<RfNode, 'id'>,
        true
      ) as WhyMapNode[]

      let bestTargetId: string | null = null
      let bestOverlap = 0
      // Track the best INVALID target in parallel — node types that the drag
      // physically overlaps but the hierarchy rules forbid. This drives the
      // red-ring + not-allowed negative feedback.
      let bestInvalidId: string | null = null
      let bestInvalidOverlap = 0
      for (const t of intersections) {
        const tSize = getNodeSize(t)
        const area = overlapArea(dragRect, {
          x: t.position.x,
          y: t.position.y,
          width: tSize.width,
          height: tSize.height,
        })
        if (s.validDropTargetIds.has(t.id)) {
          if (area > bestOverlap) {
            bestOverlap = area
            bestTargetId = t.id
          }
        } else if (t.type !== 'direction' && t.id !== s.nodeId) {
          // Exclude self and the un-droppable direction root from the
          // negative-feedback pool.
          if (area > bestInvalidOverlap) {
            bestInvalidOverlap = area
            bestInvalidId = t.id
          }
        }
      }

      if (bestTargetId !== s.dropTargetId) {
        s.dropTargetId = bestTargetId
        setDropTargetId(bestTargetId)
      }
      // Valid target wins — hide invalid feedback when a valid drop is in play.
      // Mirrors the dropTargetId guard above to avoid per-frame setState churn
      // (which would otherwise invalidate the enrichedNodes memo downstream).
      const nextInvalid = bestTargetId ? null : bestInvalidId
      if (nextInvalid !== s.invalidHoverId) {
        s.invalidHoverId = nextInvalid
        setInvalidHoverId(nextInvalid)
      }

      // ── Sibling reorder insertion index ──
      // Siblings never move; only the indicator line updates. If a cross-parent
      // target is active, hide the indicator.
      if (bestTargetId || s.siblings.length === 0) {
        if (reorderIndicator?.visible) {
          setReorderIndicator((prev) => (prev ? { ...prev, visible: false } : prev))
        }
        return
      }

      const axis = directionRef.current === 'TB' ? 'x' : 'y'
      const dragCenterCoord = node.position[axis] + size[axis === 'x' ? 'width' : 'height'] / 2
      const siblingCenters = s.siblings.map((sib) => sib.center[axis])
      const otherIds = s.siblings.map((sib) => sib.id)

      const nextInsertIndex = computeInsertIndex(
        dragCenterCoord,
        siblingCenters,
        s.nodeId,
        otherIds
      )

      if (nextInsertIndex === s.insertIndex && reorderIndicator?.visible) return
      s.insertIndex = nextInsertIndex

      // Build slotPositions for the indicator: use center positions of siblings
      // (excluding dragged) in sort_order. The indicator computes the midpoint
      // between adjacent slots to draw the insertion line.
      const slotPositions = s.siblings.map((sib) => sib.center)
      setReorderIndicator({
        slotPositions,
        insertIndex: nextInsertIndex,
        direction: directionRef.current,
        visible: true,
      })
    },
    [getIntersectingNodes, reorderIndicator?.visible, setDropTargetId, setInvalidHoverId]
  )

  // ── Drag stop ──────────────────────────────────────────────

  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: WhyMapNode) => {
      const s = dragRef.current
      setReorderIndicator(null)

      if (!s) {
        // No drag state — React Flow may still have displaced the node.
        relayout()
        return
      }

      // ── Cancelled (Esc) ─────────────────────────────────────
      if (s.cancelled) {
        setNodes((ns) =>
          ns.map((n) =>
            n.id === node.id ? ({ ...n, position: s.startPosition } as WhyMapNode) : n
          )
        )
        resetDragState()
        return
      }

      const curEdges = edgesRef.current
      const curNodes = nodesRef.current
      const nodeMap = toNodeMap(curNodes)

      // Re-evaluate drop targets from the FINAL release position. During the
      // drag, `s.dropTargetId` is the last value onNodeDrag saw — which may
      // be stale if the user brushed past a valid target on the way to their
      // final resting spot. Without this pass, a same-parent sibling reorder
      // can be mis-routed through the cross-parent branch (the "엉뚱한
      // 위치로 이동" symptom users reported on Group/Task).
      //
      // We also track the best INVALID overlap: if the user releases the
      // pointer on a node that is physically overlapping but hierarchy-
      // invalid (e.g. dropping a Task onto an Area), intent is almost
      // certainly "cancel" — falling through to the sibling-reorder branch
      // would execute an unintended move. Snap back in that case.
      let finalInvalidOverlap = 0
      {
        const finalDragRect = {
          x: node.position.x,
          y: node.position.y,
          width: s.size.width,
          height: s.size.height,
        }
        const finalIntersections = getIntersectingNodes(
          { id: node.id } as Pick<RfNode, 'id'>,
          true
        ) as WhyMapNode[]
        let finalBestTargetId: string | null = null
        let finalBestOverlap = 0
        for (const t of finalIntersections) {
          if (t.id === s.nodeId || t.type === 'direction') continue
          const tSize = getNodeSize(t)
          const area = overlapArea(finalDragRect, {
            x: t.position.x,
            y: t.position.y,
            width: tSize.width,
            height: tSize.height,
          })
          if (s.validDropTargetIds.has(t.id)) {
            if (area > finalBestOverlap) {
              finalBestOverlap = area
              finalBestTargetId = t.id
            }
          } else if (area > finalInvalidOverlap) {
            finalInvalidOverlap = area
          }
        }
        s.dropTargetId = finalBestTargetId
      }

      // Released on an invalid node with no valid target in play → treat as
      // "cancel". Snap the dragged card back to its origin without touching
      // server state. Threshold is any non-trivial overlap (>0) because the
      // user deliberately aimed at that spot.
      if (!s.dropTargetId && finalInvalidOverlap > 0) {
        setNodes((ns) =>
          ns.map((n) =>
            n.id === node.id ? ({ ...n, position: s.startPosition } as WhyMapNode) : n
          )
        )
        resetDragState()
        return
      }

      // ── Cross-parent drop ───────────────────────────────────
      if (s.dropTargetId) {
        const targetNode = nodeMap.get(s.dropTargetId)
        if (!targetNode) {
          resetDragState()
          relayout()
          return
        }

        const resolved = resolveDropTarget(s.nodeType, targetNode, curEdges)
        if (!resolved) {
          resetDragState()
          relayout()
          return
        }

        // Compute insertIndex among the TARGET container's existing children.
        // For a task dropped on a group, the hierarchy edge is group.id → task.id
        // (see tree-to-flow.ts), so we walk the group's children, not the goal's.
        // `newParentId` stays the parent goal for the moveNode API (which writes
        // goal_id + group_id), but sort-order math needs the actual visual container.
        const siblingContainerId = resolved.targetGroupId ?? resolved.newParentId
        const existingChildren = getChildrenInOrder(siblingContainerId, nodeMap, curEdges).filter(
          (c) => c.id !== s.nodeId
        )
        const axis = directionRef.current === 'TB' ? 'x' : 'y'
        const dropCenterCoord = node.position[axis] + s.size[axis === 'x' ? 'width' : 'height'] / 2
        const existingCenters = existingChildren.map((c) => getNodeCenter(c)[axis])
        const childIds = existingChildren.map((c) => c.id)

        const insertAt = computeInsertIndex(dropCenterCoord, existingCenters, s.nodeId, childIds)
        const leftOrder =
          insertAt > 0
            ? (existingChildren[insertAt - 1]?.data?.treeNode?.meta?.sortOrder ?? null)
            : null
        const rightOrder =
          insertAt < existingChildren.length
            ? (existingChildren[insertAt]?.data?.treeNode?.meta?.sortOrder ?? null)
            : null
        const newOrder = safeNewOrderBetween(leftOrder, rightOrder)

        await performMove({
          queryClient,
          nodeType: s.nodeType,
          nodeId: s.nodeId,
          newOrder,
          newParentId: resolved.newParentId,
          targetGroupId: resolved.targetGroupId,
          relayout,
          onCleanup: resetDragState,
        })
        return
      }

      // ── Sibling reorder ────────────────────────────────────
      //
      // Previously this branch compared `s.insertIndex` (others-space) against
      // `siblingIds.indexOf(nodeId)` (full-space). They coincide by math but the
      // threshold — "must cross the full center of a neighbor card" — misfires
      // on large cards (Goal/Group/Task width 180–260px), causing frequent
      // false-positive no-op detection → snap-back.
      //
      // Fix: recompute insertIndex fresh from the release position (avoids
      // stale values after the cross-parent hover early-return path at
      // onNodeDrag), then gate the no-op path on sort_order comparison
      // instead of index equality.

      if (s.siblingIds.length <= 1) {
        // Nothing to reorder against — locally snap back without a relayout.
        setNodes((ns) =>
          ns.map((n) =>
            n.id === node.id ? ({ ...n, position: s.startPosition } as WhyMapNode) : n
          )
        )
        resetDragState()
        return
      }

      const axis = directionRef.current === 'TB' ? 'x' : 'y'
      const dragCenterCoord = node.position[axis] + s.size[axis === 'x' ? 'width' : 'height'] / 2
      const siblingCentersForStop = s.siblings.map((sib) => sib.center[axis])
      const otherIdsForStop = s.siblings.map((sib) => sib.id)
      s.insertIndex = computeInsertIndex(
        dragCenterCoord,
        siblingCentersForStop,
        s.nodeId,
        otherIdsForStop
      )

      const { leftId, rightId } = boundingSiblings(s.insertIndex, s.siblingIds, s.nodeId)
      const leftOrder = leftId
        ? (s.siblings.find((sib) => sib.id === leftId)?.sortOrder ?? null)
        : null
      const rightOrder = rightId
        ? (s.siblings.find((sib) => sib.id === rightId)?.sortOrder ?? null)
        : null

      // No-op detection: preferred path uses sort_order comparison — if the
      // dragged node's current sort_order is still strictly between the
      // bounding left/right orders, nothing actually moved. For legacy rows
      // with no sort_order (null), fall back to comparing bounding sibling
      // **ids** against the dragged node's original slot.
      const currentOrder = s.draggedSortOrder
      const isNoOp =
        currentOrder !== null
          ? isNoOpSiblingDrop(currentOrder, leftOrder, rightOrder)
          : isNoOpSiblingDropByIds(s.siblingIds, s.nodeId, leftId, rightId)

      if (isNoOp) {
        setNodes((ns) =>
          ns.map((n) =>
            n.id === node.id ? ({ ...n, position: s.startPosition } as WhyMapNode) : n
          )
        )
        resetDragState()
        return
      }

      const newOrder = safeNewOrderBetween(leftOrder, rightOrder)

      await performMove({
        queryClient,
        nodeType: s.nodeType,
        nodeId: s.nodeId,
        newOrder,
        newParentId: undefined,
        targetGroupId: null,
        relayout,
        onCleanup: resetDragState,
      })
    },
    [queryClient, relayout, resetDragState, setNodes, getIntersectingNodes]
  )

  // ── Cancel (Esc) ───────────────────────────────────────────

  const cancelDrag = useCallback(() => {
    const s = dragRef.current
    if (!s) return
    s.cancelled = true
    setReorderIndicator(null)
    setDropTargetId(null)
    setInvalidHoverId(null)
  }, [setDropTargetId, setInvalidHoverId])

  return { onNodeDragStart, onNodeDrag, onNodeDragStop, cancelDrag, dragGhost, reorderIndicator }
}

// ── Server move with optimistic update + rollback ───────────

interface PerformMoveArgs {
  queryClient: ReturnType<typeof useQueryClient>
  nodeType: NodeType
  nodeId: string
  newOrder: string
  newParentId: string | undefined
  targetGroupId: string | null
  relayout: () => void
  onCleanup: () => void
}

async function performMove({
  queryClient,
  nodeType,
  nodeId,
  newOrder,
  newParentId,
  targetGroupId,
  relayout,
  onCleanup,
}: PerformMoveArgs): Promise<void> {
  // Skip direction — it's not moveable and not in MoveNodeType.
  if (nodeType === 'direction') {
    onCleanup()
    relayout()
    return
  }

  const moveType = nodeType as MoveNodeType

  // Optimistic patch — all related caches updated in one shot.
  const optimisticInput: MoveOptimisticInput = {
    nodeType: moveType,
    nodeId,
    newOrder,
    newParentId: newParentId ?? undefined,
    newGroupId: nodeType === 'task' ? targetGroupId : undefined,
  }
  const snapshot: CacheSnapshot = patchMoveInCaches(queryClient, optimisticInput)

  // Clean up drag state so the UI is interactive during the network call.
  onCleanup()

  // Relayout IMMEDIATELY with the optimistic cache patch in place. ELK will
  // reposition the dragged node into its new sort-order slot without waiting
  // for the network round-trip — this is the fix for the "drop flash" where
  // the card would otherwise hang at its mouse release coordinate for hundreds
  // of milliseconds until the server responded.
  relayout()

  let moveFailed = false
  try {
    const result = await moveNode({
      nodeId,
      nodeType,
      newOrder,
      newParentId: newParentId ?? undefined,
      targetGroupId,
    })
    if (!result.success) {
      moveFailed = true
      rollbackMovePatch(queryClient, snapshot)
      // moveNode's error can be either a plain string (from the handler) or an
      // object (from authAction's ApiErrorResponse wrapper). Normalize to string.
      const message =
        typeof result.error === 'string'
          ? result.error
          : (result.error?.message ?? '이동에 실패했어요. 다시 시도해주세요.')
      toast.error(message)
    }
  } catch (err) {
    moveFailed = true
    rollbackMovePatch(queryClient, snapshot)
    toast.error('이동에 실패했어요. 네트워크를 확인해주세요.')
    if (process.env.NODE_ENV === 'development') {
      console.error('[useCanvasReorder] moveNode threw:', err)
    }
  }

  // On success: trust the optimistic patch. The next natural refetch (window
  // focus, stale time expiry, or an adjacent mutation) will reconcile with the
  // server. Invalidating all five root keys here would refetch immediately and
  // potentially cause the canvas to re-layout on the server response, producing
  // a visible blink that undoes the "drop feels instant" win.
  //
  // On failure: rollbackMovePatch already restored the previous cache state,
  // so invalidation is redundant — but we do need a second relayout to snap
  // the dragged node back to its pre-drag slot.
  if (moveFailed) {
    relayout()
    return
  }

  // On success: cross-parent moves are now recorded in activity_log by the
  // server. Invalidate the timeline query key (which is separate from tasks/
  // goals caches) so 기록 탭 shows the new event on next view. This does NOT
  // trigger canvas relayout because no canvas-facing cache is touched.
  if (newParentId !== undefined) {
    queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
  }
}
