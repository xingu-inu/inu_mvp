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
 *   - area-compound-1 (wraps area + descendants)
 *     - area-1 (leaf, the area card itself)
 *     - goal-1 (leaf)
 *     - goal-2 (leaf or compound when expanded goes into the same container)
 *     - ... groups/tasks when goals are expanded
 *   - area-compound-2
 *     - ...
 *
 * The area compound wrapper ensures each area's subtree is spatially grouped
 * without overlap, replacing dagre's custom iterative overlap resolver.
 *
 * `sort_order` is respected because children arrays are sorted before being
 * passed to ELK, and `considerModelOrder.strategy: NODES_AND_EDGES` tells ELK
 * to preserve that order during crossing minimization.
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

  // Collect every descendant id of a subtree (area, used to flatten into area compound)
  const collectDescendants = (rootId: string): string[] => {
    const out: string[] = []
    const visited = new Set<string>()
    const walk = (id: string) => {
      if (visited.has(id)) return
      visited.add(id)
      const kids = childrenByParent.get(id)
      if (!kids) return
      for (const k of kids) {
        out.push(k)
        walk(k)
      }
    }
    walk(rootId)
    return out
  }

  // Helper: build children list ordered so that ancestors appear before descendants
  // (area first, then goals sorted, then each goal's expanded subtree sorted, ...).
  // This preserves considerModelOrder intent top-to-bottom.
  const buildOrderedSubtreeIds = (rootId: string): string[] => {
    const out: string[] = [rootId]
    const walk = (parentId: string) => {
      const kids = childrenByParent.get(parentId)
      if (!kids) return
      for (const k of kids) {
        out.push(k)
        walk(k)
      }
    }
    walk(rootId)
    return out
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

  // 2. Each area becomes a compound wrapper containing the area card + all its descendants
  const directionDescendants = new Set<string>()
  for (const areaId of directionChildren) {
    directionDescendants.add(areaId)
    for (const desc of collectDescendants(areaId)) directionDescendants.add(desc)

    const areaSubtreeIds = buildOrderedSubtreeIds(areaId)
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
