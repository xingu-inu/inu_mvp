import type { ElkNode, ElkExtendedEdge, LayoutOptions } from 'elkjs/lib/elk-api'
import type { WhyMapNode, WhyMapEdge } from './types'

// ── Default dimensions for unmeasured nodes ───────────────────
// Used as fallback before React Flow measures actual DOM sizes.
// The two-pass strategy (opacity: 0 → measured → opacity: 1) means these
// only apply for the initial render flash, so rough estimates are fine.
export const DEFAULT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  direction: { width: 340, height: 110 },
  area: { width: 240, height: 80 },
  goal: { width: 260, height: 90 },
  group: { width: 200, height: 64 },
  task: { width: 180, height: 56 },
  sticky: { width: 180, height: 100 },
}

// ── Layout options ────────────────────────────────────────────

/**
 * ELK layered layout options tuned for the Why Map canvas.
 *
 * Key settings:
 * - `considerModelOrder.strategy: NODES_AND_EDGES` — ELK preserves the input
 *   child order during crossing minimization, so `sort_order` is honored
 *   without a custom post-processing pass.
 * - `crossingMinimization.semiInteractive: true` — complements considerModelOrder
 *   by making ELK treat the input order as a strong hint.
 * - `hierarchyHandling: INCLUDE_CHILDREN` — lets edges cross compound boundaries
 *   so direction→area→goal edges route cleanly when areas are compound containers.
 * - `nodePlacement.strategy` is left at default (BRANDES_KOEPF) per 2025 docs.
 *
 * Reference: https://reactflow.dev/examples/layout/elkjs
 */
export function getElkLayoutOptions(direction: 'LR' | 'TB'): LayoutOptions {
  return {
    'elk.algorithm': 'layered',
    'elk.direction': direction === 'LR' ? 'RIGHT' : 'DOWN',
    'elk.layered.spacing.nodeNodeBetweenLayers': '72',
    'elk.spacing.nodeNode': '40',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    'elk.layered.crossingMinimization.semiInteractive': 'true',
    'elk.spacing.componentComponent': '80',
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
    'elk.padding': '[top=24,left=24,bottom=24,right=24]',
  }
}

// ── Synthetic compound id prefix ─────────────────────────────

/** Marker for compound wrapper nodes that don't correspond to real React Flow nodes. */
const AREA_COMPOUND_PREFIX = '__elk-area-compound:'

export function isCompoundWrapperId(id: string): boolean {
  return id.startsWith(AREA_COMPOUND_PREFIX)
}

// ── Conversion ───────────────────────────────────────────────

interface TreeToElkResult {
  graph: ElkNode
}

/**
 * Convert flat React Flow nodes/edges into an ELK compound graph.
 *
 * Structure:
 * - root
 *   - direction (leaf)
 *   - area-compound-1 (wraps area card + all its descendants as flat children)
 *     - area-1 card
 *     - goal-1, goal-2, goal-3            (all goals first, per-parent sort_order)
 *     - group-2a, group-2b                (then groups, per-parent sort_order)
 *     - task-2b1, task-2b2                (then tasks)
 *   - area-compound-2
 *     - ...
 *
 * The area compound wrapper ensures each area's subtree is spatially grouped
 * without overlap, replacing dagre's custom iterative overlap resolver.
 *
 * Critical ordering rule — "BFS by depth, then sort_order within depth":
 * The flat children list is built layer-by-layer (area card → all goals →
 * all groups → all tasks), NOT in tree-DFS order. This keeps the INDEX
 * POSITIONS of sibling Goals / sibling Groups stable across expand/collapse.
 *
 * Why it matters: `considerModelOrder.strategy: NODES_AND_EDGES` uses a node's
 * index in the compound children array as a within-layer ordering hint. DFS
 * order [area, goal1, goal2, group2a, group2b, goal3] splits goal2 and goal3
 * apart (goal3 jumps from index 3 to index 5 when goal2 is expanded), which
 * destabilizes ELK's layer-order calculation and can visually swap siblings.
 * BFS order [area, goal1, goal2, goal3, group2a, group2b] keeps goal indices
 * consecutive regardless of which goal is expanded, so expanding one node
 * only APPENDS its children to the end of the list and never perturbs
 * sibling positions.
 *
 * `sort_order` is respected because children arrays are sorted (per parent)
 * before being laid out into the BFS layers, and `considerModelOrder.strategy:
 * NODES_AND_EDGES` tells ELK to preserve that order during crossing minimization.
 */
export function treeToElkGraph(
  nodes: WhyMapNode[],
  edges: WhyMapEdge[],
  direction: 'LR' | 'TB'
): TreeToElkResult {
  const nodeMap = new Map<string, WhyMapNode>(nodes.map((n) => [n.id, n]))

  // Only hierarchy edges participate in layout
  const hierarchyEdges = edges.filter((e) => e.data?.edgeType === 'hierarchy')

  // Children index by parent
  const childrenByParent = new Map<string, string[]>()
  for (const edge of hierarchyEdges) {
    const list = childrenByParent.get(edge.source) ?? []
    list.push(edge.target)
    childrenByParent.set(edge.source, list)
  }

  // Sort each parent's children by sort_order (alphabetical fractional index).
  // This is the input order that considerModelOrder will preserve.
  const sortByOrder = (aId: string, bId: string) => {
    const aOrder = nodeMap.get(aId)?.data?.treeNode?.meta?.sortOrder ?? ''
    const bOrder = nodeMap.get(bId)?.data?.treeNode?.meta?.sortOrder ?? ''
    return aOrder.localeCompare(bOrder)
  }
  for (const list of childrenByParent.values()) {
    list.sort(sortByOrder)
  }

  // Find the direction (root) node — it's the one that's not a target of any edge.
  const allTargets = new Set(hierarchyEdges.map((e) => e.target))
  const directionNode = nodes.find((n) => n.type === 'direction' && !allTargets.has(n.id))

  // Build ELK node for a leaf (with default dims)
  const toElkLeaf = (id: string): ElkNode => {
    const n = nodeMap.get(id)
    const type = n?.type ?? 'goal'
    const defaults = DEFAULT_DIMENSIONS[type] ?? DEFAULT_DIMENSIONS.goal
    return {
      id,
      width: n?.measured?.width ?? defaults.width,
      height: n?.measured?.height ?? defaults.height,
    }
  }

  /**
   * Build a flat children list for an area compound, ordered breadth-first
   * by depth. Also returns a set containing every visited id so callers can
   * track "which ids this area consumed" without a second tree walk.
   *
   * Output shape: the root id at index 0, then every descendant at depth 1,
   * then depth 2, and so on. Within each depth, nodes are emitted in parent
   * order (inherited from the previous depth) and then by `sort_order` within
   * each parent's block (because `childrenByParent` was pre-sorted above).
   *
   * Why BFS and not DFS: expand/collapse stability. ELK's
   * `considerModelOrder.strategy: NODES_AND_EDGES` treats a node's index in
   * its compound's children array as a within-layer ordering hint. DFS would
   * split sibling Goals apart when one of them is expanded (its descendants
   * get interleaved between it and the next sibling), bumping the next
   * sibling's index and visually shuffling the goal column. BFS keeps every
   * depth's sibling block contiguous, so expanding a node only appends ids
   * to the tail and never perturbs earlier indices.
   *
   * The `visited` guard mirrors `collectDescendants` elsewhere and protects
   * against two degenerate cases: (1) a cycle in the edge data (shouldn't
   * exist by invariant, but a broken reorder action or manual DB edit could
   * introduce one and would otherwise infinite-loop here), and (2) a
   * duplicate hierarchy edge producing the same child id twice (ELK rejects
   * duplicate ids in a compound with a non-obvious error).
   */
  const buildLayeredSubtreeIds = (rootId: string): { ids: string[]; visited: Set<string> } => {
    const ids: string[] = [rootId]
    const visited = new Set<string>([rootId])
    let frontier: string[] = [rootId]
    while (frontier.length > 0) {
      const next: string[] = []
      for (const parentId of frontier) {
        const kids = childrenByParent.get(parentId)
        if (!kids) continue
        for (const k of kids) {
          if (visited.has(k)) continue
          visited.add(k)
          ids.push(k)
          next.push(k)
        }
      }
      frontier = next
    }
    return { ids, visited }
  }

  // Find root-level children of direction (areas)
  const directionChildren: string[] = directionNode
    ? (childrenByParent.get(directionNode.id) ?? [])
    : []

  const rootChildren: ElkNode[] = []

  // 1. Direction leaf at root (if it exists and isn't a ghost without data)
  if (directionNode) {
    rootChildren.push(toElkLeaf(directionNode.id))
  }

  // 2. Each area becomes a compound wrapper containing the area card + all
  //    descendants laid out in BFS-by-depth order (see `buildLayeredSubtreeIds`).
  //    `visited` is reused as `directionDescendants` so we don't walk the same
  //    subtree twice just to compute the orphan-exclusion set below.
  const directionDescendants = new Set<string>()
  for (const areaId of directionChildren) {
    const { ids: areaSubtreeIds, visited: areaVisited } = buildLayeredSubtreeIds(areaId)
    for (const id of areaVisited) directionDescendants.add(id)

    const areaChildren: ElkNode[] = areaSubtreeIds.map(toElkLeaf)

    rootChildren.push({
      id: `${AREA_COMPOUND_PREFIX}${areaId}`,
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': direction === 'LR' ? 'RIGHT' : 'DOWN',
        'elk.padding': '[top=28,left=28,bottom=28,right=28]',
        'elk.layered.spacing.nodeNodeBetweenLayers': '60',
        'elk.spacing.nodeNode': '32',
      },
      children: areaChildren,
    })
  }

  // 3. Orphan leaves — nodes that somehow don't belong to the direction subtree
  //    (e.g. ghost nodes detached from tree). Render them at root.
  for (const node of nodes) {
    if (node.id === directionNode?.id) continue
    if (directionDescendants.has(node.id)) continue
    rootChildren.push(toElkLeaf(node.id))
  }

  // Build edges. With hierarchyHandling=INCLUDE_CHILDREN, we can keep all
  // hierarchy edges at the root level regardless of which compound endpoints sit in.
  const elkEdges: ElkExtendedEdge[] = hierarchyEdges.map((e) => ({
    id: e.id,
    sources: [e.source],
    targets: [e.target],
  }))

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: getElkLayoutOptions(direction),
    children: rootChildren,
    edges: elkEdges,
  }

  return { graph }
}

// ── Result traversal: flatten compound graph back to absolute positions ──

export interface LaidOutNode {
  id: string
  /** Absolute top-left X in the canvas coordinate space. */
  x: number
  /** Absolute top-left Y in the canvas coordinate space. */
  y: number
  width: number
  height: number
}

/**
 * Walk an ELK result graph and return absolute positions for every leaf node,
 * skipping synthetic compound wrappers. Absolute position = sum of ancestor
 * compound offsets + own local offset.
 */
export function flattenElkResult(result: ElkNode): Map<string, LaidOutNode> {
  const out = new Map<string, LaidOutNode>()

  function walk(node: ElkNode, parentX: number, parentY: number) {
    const x = parentX + (node.x ?? 0)
    const y = parentY + (node.y ?? 0)

    // Skip root and compound wrappers — they don't correspond to real React Flow nodes
    if (node.id !== 'root' && !isCompoundWrapperId(node.id)) {
      out.set(node.id, {
        id: node.id,
        x,
        y,
        width: node.width ?? 0,
        height: node.height ?? 0,
      })
    }

    for (const child of node.children ?? []) {
      walk(child, x, y)
    }
  }

  walk(result, 0, 0)
  return out
}
