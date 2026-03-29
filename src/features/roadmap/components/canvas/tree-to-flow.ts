import type { GoalStatus } from '@/types/entities'
import type { VisualTreeNode } from '../visual-tree/tree-node-card'
import type { CrossLink } from '../cross-link-overlay'
import type {
  WhyMapNode,
  WhyMapEdge,
  AncestorWhy,
  DirectionNodeData,
  AreaNodeData,
  GoalNodeData,
  GroupNodeData,
  TaskNodeData,
  HierarchyEdgeData,
  SharedTaskEdgeData,
} from './types'

/**
 * Convert a VisualTreeNode tree into ReactFlow nodes and edges.
 *
 * Direction / Area / Goal always become canvas nodes.
 * Group / Task become canvas nodes only when their parent Goal is in expandedGoalIds.
 */
export function treeToFlowElements(
  tree: VisualTreeNode | null,
  crossLinks: CrossLink[],
  expandedGoalIds: Set<string> = new Set()
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

  // Ancestor why for Direction (root)
  const directionWhy: AncestorWhy = { name: tree.name, why: tree.why }

  for (const area of areas) {
    // ── Area node ───────────────────────────────────────
    const areaGoals = area.children ?? []

    // Compute status counts for Area badge
    const statusCounts: Partial<Record<GoalStatus, number>> = {}
    for (const goal of areaGoals) {
      const s = (goal.status ?? 'active') as GoalStatus
      statusCounts[s] = (statusCounts[s] ?? 0) + 1
    }

    const areaAncestorWhys: AncestorWhy[] = [directionWhy]

    nodes.push({
      id: area.id,
      type: 'area',
      position: { x: 0, y: 0 },
      data: {
        treeNode: area,
        goalCount: areaGoals.length,
        statusCounts,
        ancestorWhys: areaAncestorWhys,
      } satisfies AreaNodeData,
    })

    // Direction → Area edge
    edges.push({
      id: `e-${tree.id}-${area.id}`,
      source: tree.id,
      target: area.id,
      type: 'hierarchy',
      data: { edgeType: 'hierarchy', depth: 0 } satisfies HierarchyEdgeData,
    })

    const areaColor = area.color ?? '#8a8078'
    const goalAncestorWhys: AncestorWhy[] = [directionWhy, { name: area.name, why: area.why }]

    for (const goal of areaGoals) {
      const isExpanded = expandedGoalIds.has(goal.id)

      // ── Goal node ───────────────────────────────────
      nodes.push({
        id: goal.id,
        type: 'goal',
        position: { x: 0, y: 0 },
        data: {
          treeNode: goal,
          areaColor,
          parentAreaId: area.id,
          ancestorWhys: goalAncestorWhys,
          isExpanded,
        } satisfies GoalNodeData,
      })

      // Area → Goal edge
      edges.push({
        id: `e-${area.id}-${goal.id}`,
        source: area.id,
        target: goal.id,
        type: 'hierarchy',
        data: { edgeType: 'hierarchy', depth: 1 } satisfies HierarchyEdgeData,
      })

      // ── Expanded: Group / Task child nodes ─────────
      if (isExpanded && goal.children) {
        const goalChildWhys: AncestorWhy[] = [
          ...goalAncestorWhys,
          { name: goal.name, why: goal.why },
        ]
        emitGoalChildren(goal, goal.id, areaColor, goalChildWhys, nodes, edges)
      }
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
 * Emit Group and Task nodes for an expanded Goal.
 */
function emitGoalChildren(
  goal: VisualTreeNode,
  goalId: string,
  areaColor: string,
  ancestorWhys: AncestorWhy[],
  nodes: WhyMapNode[],
  edges: WhyMapEdge[]
): void {
  for (const child of goal.children ?? []) {
    if (child.type === 'group') {
      nodes.push({
        id: child.id,
        type: 'group',
        position: { x: 0, y: 0 },
        data: {
          treeNode: child,
          areaColor,
          parentGoalId: goalId,
          ancestorWhys,
        } satisfies GroupNodeData,
      })

      // Goal → Group edge
      edges.push({
        id: `e-${goalId}-${child.id}`,
        source: goalId,
        target: child.id,
        type: 'hierarchy',
        data: { edgeType: 'hierarchy', depth: 2 } satisfies HierarchyEdgeData,
      })

      // Group → Task edges
      for (const task of child.children ?? []) {
        if (task.type === 'task') {
          nodes.push({
            id: task.id,
            type: 'task',
            position: { x: 0, y: 0 },
            data: {
              treeNode: task,
              areaColor,
              parentGoalId: goalId,
              parentGroupId: child.id,
              ancestorWhys,
            } satisfies TaskNodeData,
          })

          edges.push({
            id: `e-${child.id}-${task.id}`,
            source: child.id,
            target: task.id,
            type: 'hierarchy',
            data: { edgeType: 'hierarchy', depth: 3 } satisfies HierarchyEdgeData,
          })
        }
      }
    } else if (child.type === 'task') {
      // Direct task under goal (no group)
      nodes.push({
        id: child.id,
        type: 'task',
        position: { x: 0, y: 0 },
        data: {
          treeNode: child,
          areaColor,
          parentGoalId: goalId,
          ancestorWhys,
        } satisfies TaskNodeData,
      })

      edges.push({
        id: `e-${goalId}-${child.id}`,
        source: goalId,
        target: child.id,
        type: 'hierarchy',
        data: { edgeType: 'hierarchy', depth: 2 } satisfies HierarchyEdgeData,
      })
    }
  }
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
