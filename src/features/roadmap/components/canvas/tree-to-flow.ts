import type { GoalStatus } from '@/types/entities'
import type { VisualTreeNode } from '../visual-tree/tree-node-card'
import type { CrossLink } from '../cross-link-overlay'
import type {
  WhyMapNode,
  WhyMapEdge,
  DirectionNodeData,
  AreaNodeData,
  GoalNodeData,
  HierarchyEdgeData,
  SharedTaskEdgeData,
} from './types'

/**
 * Convert a VisualTreeNode tree into ReactFlow nodes and edges.
 *
 * ONLY Direction / Area / Goal become canvas nodes.
 * Goal children (Group/Task) are embedded inside GoalNodeData.treeNode.children
 * and rendered as regular React inside the GoalNode component.
 */
export function treeToFlowElements(
  tree: VisualTreeNode | null,
  crossLinks: CrossLink[]
): { nodes: WhyMapNode[]; edges: WhyMapEdge[] } {
  if (!tree) return { nodes: [], edges: [] }

  const nodes: WhyMapNode[] = []
  const edges: WhyMapEdge[] = []

  // ── Direction node ──────────────────────────────────────
  nodes.push({
    id: tree.id,
    type: 'direction',
    position: { x: 0, y: 0 },
    data: { treeNode: tree } satisfies DirectionNodeData,
  })

  const areas = tree.children ?? []

  for (const area of areas) {
    // ── Area node ───────────────────────────────────────
    const areaGoals = area.children ?? []

    // Compute status counts for Area badge
    const statusCounts: Partial<Record<GoalStatus, number>> = {}
    for (const goal of areaGoals) {
      const s = (goal.status ?? 'active') as GoalStatus
      statusCounts[s] = (statusCounts[s] ?? 0) + 1
    }

    nodes.push({
      id: area.id,
      type: 'area',
      position: { x: 0, y: 0 },
      data: {
        treeNode: area,
        goalCount: areaGoals.length,
        statusCounts,
      } satisfies AreaNodeData,
    })

    // Direction → Area edge
    edges.push({
      id: `e-${tree.id}-${area.id}`,
      source: tree.id,
      target: area.id,
      type: 'hierarchy',
      data: { edgeType: 'hierarchy' } satisfies HierarchyEdgeData,
    })

    for (const goal of areaGoals) {
      // ── Goal node ───────────────────────────────────
      nodes.push({
        id: goal.id,
        type: 'goal',
        position: { x: 0, y: 0 },
        data: {
          treeNode: goal,
          areaColor: area.color ?? '#8a8078',
        } satisfies GoalNodeData,
      })

      // Area → Goal edge
      edges.push({
        id: `e-${area.id}-${goal.id}`,
        source: area.id,
        target: goal.id,
        type: 'hierarchy',
        data: { edgeType: 'hierarchy' } satisfies HierarchyEdgeData,
      })
    }
  }

  // ── Shared-task edges (Goal ↔ Goal) ─────────────────────
  // Pre-build taskId → goalId lookup (O(n) once, instead of O(n*m) per link)
  const taskToGoalMap = buildTaskToGoalMap(tree)

  // Group cross-links by (goalA, goalB) pair to compute strength
  const pairStrengthMap = new Map<string, { areaColor: string; count: number }>()

  for (const link of crossLinks) {
    // Only process task→goal cross-links (not goal→area impact links)
    if (!link.sourceTaskId || !link.targetGoalId) continue

    // Find which goal owns the source task
    const sourceGoalId = taskToGoalMap.get(link.sourceTaskId)
    if (!sourceGoalId || sourceGoalId === link.targetGoalId) continue

    // Canonical pair key (sorted to avoid duplicates)
    const pairKey = [sourceGoalId, link.targetGoalId].sort().join('::')

    const existing = pairStrengthMap.get(pairKey)
    if (existing) {
      existing.count += 1
    } else {
      pairStrengthMap.set(pairKey, { areaColor: link.areaColor, count: 1 })
    }
  }

  for (const [pairKey, { areaColor, count }] of pairStrengthMap) {
    const [goalA, goalB] = pairKey.split('::')
    edges.push({
      id: `shared-${goalA}-${goalB}`,
      source: goalA,
      target: goalB,
      type: 'shared-task',
      data: {
        edgeType: 'shared-task',
        strength: count,
        areaColor,
      } satisfies SharedTaskEdgeData,
    })
  }

  return { nodes, edges }
}

/**
 * Build a Map<taskId, goalId> by walking Direction → Area → Goal → subtree.
 * O(n) single pass instead of O(n*m) per cross-link lookup.
 */
function buildTaskToGoalMap(tree: VisualTreeNode): Map<string, string> {
  const map = new Map<string, string>()
  for (const area of tree.children ?? []) {
    for (const goal of area.children ?? []) {
      collectTaskIds(goal, goal.id, map)
    }
  }
  return map
}

function collectTaskIds(node: VisualTreeNode, goalId: string, map: Map<string, string>): void {
  if (node.type === 'task') {
    map.set(node.id, goalId)
  }
  for (const child of node.children ?? []) {
    collectTaskIds(child, goalId, map)
  }
}
