import type { Node, Edge } from '@xyflow/react'
import type { NodeType } from '@/actions/tree.actions'

// ── Hierarchy rules ───────────────────────────────────────────

/**
 * Full parent map for every NodeType in the hierarchy.
 * Documents the entire Direction → Area → Goal → Group → Task chain
 * explicitly so there are no "quietly undefined" entries.
 */
export const VALID_PARENTS: Record<NodeType, readonly NodeType[]> = {
  direction: [],
  area: ['direction'],
  goal: ['area'],
  group: ['goal'],
  task: ['goal', 'group'],
}

/**
 * Node types that can be picked up and dropped.
 * `direction` is the only root and is intentionally excluded.
 *
 * Note: Area's only valid parent is `direction` and there is a single
 * direction node, so Area drags can only be sibling reorders — there is
 * no cross-parent case for Area in `resolveDropTarget`.
 */
export const DRAGGABLE_TYPES: readonly NodeType[] = ['area', 'goal', 'group', 'task']

/**
 * Can a node of `dragType` be dropped onto a node of `targetType`
 * as a new parent (cross-parent move)?
 *
 * Same-type siblings always return false (e.g. goal onto goal) because
 * a node can't be reparented onto another node of the same type — that
 * scenario is sibling reorder, handled separately by the caller via
 * the `siblingIds` set rather than `canDropOnParent`.
 */
export function canDropOnParent(dragType: NodeType, targetType: NodeType): boolean {
  if (!DRAGGABLE_TYPES.includes(dragType)) return false
  return VALID_PARENTS[dragType].includes(targetType)
}

// ── Cycle prevention ──────────────────────────────────────────

/**
 * Does `nodeId` have `potentialAncestorId` as an ancestor in the hierarchy?
 * Walks hierarchy edges upward from `nodeId`. Returns true if
 * `potentialAncestorId` is found along the chain, preventing
 * dropping a node onto its own descendant.
 *
 * Accepts pre-filtered hierarchy edges to avoid redundant filtering.
 */
export function hasAncestor(
  nodeId: string,
  potentialAncestorId: string,
  hierarchyEdges: Edge[]
): boolean {
  let current = nodeId
  const visited = new Set<string>()

  while (true) {
    if (visited.has(current)) break
    visited.add(current)

    const parentEdge = hierarchyEdges.find((e) => e.target === current)
    if (!parentEdge) break

    if (parentEdge.source === potentialAncestorId) return true
    current = parentEdge.source
  }

  return false
}

// ── Valid drop targets ────────────────────────────────────────

/**
 * Returns all nodes that `dragNode` can be dropped onto as a new parent.
 * Combines type-based rules with cycle prevention, and excludes
 * the current parent (same parent = sibling reorder, not cross-parent).
 */
export function getValidDropTargets(dragNode: Node, allNodes: Node[], edges: Edge[]): Node[] {
  const dragType = dragNode.type as NodeType
  if (!dragType) return []

  // Pre-filter hierarchy edges once for all checks
  const hierarchyEdges = edges.filter(
    (e) => (e.data as Record<string, unknown>)?.edgeType === 'hierarchy'
  )

  // Find current parent
  const parentEdge = hierarchyEdges.find((e) => e.target === dragNode.id)
  const currentParentId = parentEdge?.source ?? null

  return allNodes.filter((target) => {
    // Skip self
    if (target.id === dragNode.id) return false

    // Skip current parent (same parent = sibling reorder)
    if (target.id === currentParentId) return false

    const targetType = target.type as NodeType
    if (!targetType) return false

    // Type-based rule check
    if (!canDropOnParent(dragType, targetType)) return false

    // Cycle prevention: can't drop onto own descendant
    if (hasAncestor(target.id, dragNode.id, hierarchyEdges)) return false

    return true
  })
}
