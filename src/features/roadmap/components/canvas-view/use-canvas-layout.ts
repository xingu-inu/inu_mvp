import dagre from '@dagrejs/dagre'
import { type Node, type Edge, Position } from '@xyflow/react'
import type { CanvasNodeData } from './canvas-node'

const DEFAULT_WIDTH = 220
const DEFAULT_HEIGHT = 56

const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  direction: { width: 260, height: 64 },
  area: { width: 240, height: 56 },
  goal: { width: 220, height: 56 },
  group: { width: 200, height: 48 },
  task: { width: 200, height: 48 },
  sticky: { width: 160, height: 120 },
}

export function getLayoutedElements<N extends Node>(
  nodes: N[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): N[] {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 40, marginx: 40, marginy: 40 })

  for (const node of nodes) {
    if (node.type === 'sticky') continue

    const dims = NODE_DIMENSIONS[node.type ?? ''] ?? {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    }
    graph.setNode(node.id, {
      width: node.measured?.width ?? dims.width,
      height: node.measured?.height ?? dims.height,
    })
  }

  for (const edge of edges) {
    if (edge.type === 'crossLink') continue
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target)
    }
  }

  dagre.layout(graph)

  const isHorizontal = direction === 'LR'
  const srcPos = isHorizontal ? Position.Right : Position.Bottom
  const tgtPos = isHorizontal ? Position.Left : Position.Top

  return nodes.map((node) => {
    if (node.type === 'sticky') return node

    const dagreNode = graph.node(node.id)
    if (!dagreNode) return node

    const dims = NODE_DIMENSIONS[node.type ?? ''] ?? {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    }

    return {
      ...node,
      position: {
        x: dagreNode.x - (dagreNode.width ?? dims.width) / 2,
        y: dagreNode.y - (dagreNode.height ?? dims.height) / 2,
      },
      // Update handle positions in node data for CanvasNode to read
      data: {
        ...(node.data as CanvasNodeData),
        sourcePosition: srcPos,
        targetPosition: tgtPos,
      },
    } as N
  })
}
