import { useEffect, useCallback, useRef } from 'react'
import {
  useNodesInitialized,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Position,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import type { WhyMapNode, WhyMapEdge } from './types'

// Default dimensions for unmeasured nodes
const DEFAULT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  direction: { width: 280, height: 80 },
  area: { width: 240, height: 60 },
  goal: { width: 260, height: 80 },
  group: { width: 220, height: 60 },
  task: { width: 200, height: 50 },
  sticky: { width: 200, height: 120 },
}

function getLayoutedElements(
  nodes: WhyMapNode[],
  edges: WhyMapEdge[],
  direction: 'TB' | 'LR'
): WhyMapNode[] {
  const g = new dagre.graphlib.Graph({ compound: true })
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80, edgesep: 20 })

  for (const node of nodes) {
    const defaults = DEFAULT_DIMENSIONS[node.type ?? 'goal']
    g.setNode(node.id, {
      width: node.measured?.width ?? defaults.width,
      height: node.measured?.height ?? defaults.height,
    })
  }

  // Set compound parent-child relationships so subtrees don't overlap vertically
  for (const edge of edges) {
    if (edge.data?.edgeType === 'hierarchy') {
      g.setEdge(edge.source, edge.target)

      // Find parent node type to set compound grouping
      const parentNode = nodes.find((n) => n.id === edge.source)
      if (parentNode) {
        // Area groups its goals; Goal groups its groups/tasks
        if (parentNode.type === 'area' || parentNode.type === 'goal') {
          g.setParent(edge.target, edge.source)
        }
      }
    }
  }

  dagre.layout(g)

  return nodes.map((node) => {
    const dagreNode = g.node(node.id)
    const defaults = DEFAULT_DIMENSIONS[node.type ?? 'goal']
    const w = node.measured?.width ?? defaults.width
    const h = node.measured?.height ?? defaults.height

    return {
      ...node,
      position: {
        x: dagreNode.x - w / 2,
        y: dagreNode.y - h / 2,
      },
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
    }
  })
}

export function useDagreLayout(
  initialNodes: WhyMapNode[],
  initialEdges: WhyMapEdge[],
  direction: 'TB' | 'LR'
): {
  nodes: WhyMapNode[]
  edges: WhyMapEdge[]
  setNodes: React.Dispatch<React.SetStateAction<WhyMapNode[]>>
  setEdges: React.Dispatch<React.SetStateAction<WhyMapEdge[]>>
  onNodesChange: OnNodesChange<WhyMapNode>
  onEdgesChange: OnEdgesChange<WhyMapEdge>
  relayout: () => void
} {
  const [nodes, setNodes, onNodesChange] = useNodesState<WhyMapNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<WhyMapEdge>(initialEdges)
  const nodesInitialized = useNodesInitialized()
  const needsLayoutRef = useRef(true)
  const edgesRef = useRef(initialEdges)
  const { fitView } = useReactFlow()

  // Track the previous initialNodes/initialEdges identity to detect data changes
  const prevInitialRef = useRef({ nodes: initialNodes, edges: initialEdges })

  // Sync when upstream data identity changes
  useEffect(() => {
    if (
      prevInitialRef.current.nodes !== initialNodes ||
      prevInitialRef.current.edges !== initialEdges
    ) {
      prevInitialRef.current = { nodes: initialNodes, edges: initialEdges }
      setNodes(initialNodes)
      setEdges(initialEdges)
      needsLayoutRef.current = true
    }
    edgesRef.current = initialEdges
  }, [initialNodes, initialEdges, setNodes, setEdges])

  // Two-pass layout: wait for nodes to be measured, then apply dagre
  useEffect(() => {
    if (nodesInitialized && needsLayoutRef.current) {
      setNodes((currentNodes) => {
        if (currentNodes.length === 0) return currentNodes
        needsLayoutRef.current = false
        const layouted = getLayoutedElements(currentNodes, edgesRef.current, direction)
        requestAnimationFrame(() => {
          fitView({ padding: 0.15, duration: 300 })
        })
        return layouted
      })
    }
  }, [nodesInitialized, direction, fitView, setNodes])

  // Manual relayout (e.g. after direction toggle or node expand)
  const relayout = useCallback(() => {
    needsLayoutRef.current = true
    setNodes((n) => [...n])
  }, [setNodes])

  return { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, relayout }
}
