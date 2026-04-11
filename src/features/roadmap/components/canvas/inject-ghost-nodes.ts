import type { ProposeStructureOutput } from '@/components/layout/ai-chat/proposal-utils'
import { DEFAULT_DIMENSIONS } from './tree-to-elk'
import type { WhyMapNode, WhyMapEdge, AreaNodeData, GoalNodeData, HierarchyEdgeData } from './types'

/**
 * Post-processes flow elements to inject ghost (preview) nodes from a brain-dump proposal.
 *
 * ID generation mirrors `toReviewAreas()` in proposal-utils.ts so that
 * `checkedItems` keys (`area-0`, `goal-1`, …) map correctly to ghost node IDs
 * (`ghost-area-0`, `ghost-goal-1`, …).
 *
 * Only area and goal level ghost nodes are created — tasks are not rendered on the canvas.
 */
export function injectGhostNodes(
  nodes: WhyMapNode[],
  edges: WhyMapEdge[],
  proposal: ProposeStructureOutput,
  checkedItems: Record<string, boolean>,
  directionNodeId: string
): { nodes: WhyMapNode[]; edges: WhyMapEdge[] } {
  const ghostNodes: WhyMapNode[] = []
  const ghostEdges: WhyMapEdge[] = []
  let idCounter = 0

  for (const area of proposal.areas) {
    const areaId = `area-${idCounter++}`
    const isAreaChecked = checkedItems[areaId] !== false // default true

    if (!isAreaChecked) {
      // Still increment counters to keep IDs in sync with toReviewAreas
      for (const goal of area.goals ?? []) {
        idCounter++ // goal
        idCounter += goal.tasks?.length ?? 0 // tasks
      }
      continue
    }

    const areaColor = area.color || '#F59E0B'

    // Only add ghost area node for NEW areas (not existing)
    if (!area.isExisting) {
      ghostNodes.push({
        id: `ghost-${areaId}`,
        type: 'area',
        position: { x: 0, y: 0 },
        // Seed measured dims so ELK has a size to lay out; the real DOM measurement
        // from React Flow will overwrite once the ghost renders.
        measured: DEFAULT_DIMENSIONS.area,
        data: {
          treeNode: {
            id: `ghost-${areaId}`,
            name: area.name || '(이름 없음)',
            type: 'area',
            emoji: area.emoji || '📌',
            color: areaColor,
          },
          goalCount: area.goals?.length ?? 0,
          statusCounts: {},
          isGhost: true,
        } satisfies AreaNodeData,
        draggable: false,
        selectable: false,
      })

      ghostEdges.push({
        id: `e-ghost-${directionNodeId}-${areaId}`,
        source: directionNodeId,
        target: `ghost-${areaId}`,
        type: 'hierarchy',
        data: { edgeType: 'hierarchy', depth: 0 } satisfies HierarchyEdgeData,
      })
    }

    // Goals attach to existing area or new ghost area
    const goalParentId =
      area.isExisting && area.existingAreaId ? area.existingAreaId : `ghost-${areaId}`

    for (const goal of area.goals ?? []) {
      const goalId = `goal-${idCounter++}`
      const isGoalChecked = checkedItems[goalId] !== false

      if (!isGoalChecked) {
        idCounter += goal.tasks?.length ?? 0
        continue
      }

      ghostNodes.push({
        id: `ghost-${goalId}`,
        type: 'goal',
        position: { x: 0, y: 0 },
        // Seed measured dims; real DOM measurement overwrites on first render.
        measured: DEFAULT_DIMENSIONS.goal,
        data: {
          treeNode: {
            id: `ghost-${goalId}`,
            name: goal.name || '(이름 없음)',
            type: 'goal',
            why: goal.why,
          },
          areaColor,
          parentAreaId: goalParentId,
          isGhost: true,
        } satisfies GoalNodeData,
        draggable: false,
        selectable: false,
      })

      ghostEdges.push({
        id: `e-ghost-${goalParentId}-${goalId}`,
        source: goalParentId,
        target: `ghost-${goalId}`,
        type: 'hierarchy',
        data: { edgeType: 'hierarchy', depth: 1 } satisfies HierarchyEdgeData,
      })

      // Keep counter in sync — tasks not rendered as ghost nodes (only area/goal level)
      idCounter += goal.tasks?.length ?? 0
    }
  }

  return {
    nodes: [...nodes, ...ghostNodes],
    edges: [...edges, ...ghostEdges],
  }
}
