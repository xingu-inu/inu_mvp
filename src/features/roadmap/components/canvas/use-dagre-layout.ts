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
  sticky: { width: 200, height: 120 },
}

function getLayoutedElements(
  nodes: WhyMapNode[],
  edges: WhyMapEdge[],
  direction: 'TB' | 'LR'
): WhyMapNode[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80, edgesep: 20 })

  for (const node of nodes) {
    const defaults = DEFAULT_DIMENSIONS[node.type ?? 'goal']
    g.setNode(node.id, {
      width: node.measured?.width ?? defaults.width,
      height: node.measured?.height ?? defaults.height,
    })
  }

  for (const edge of edges) {
    // Only hierarchy edges participate in dagre layout
    if (edge.data?.edgeType === 'hierarchy') {
      g.setEdge(edge.source, edge.target)
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
  const layoutAppliedRef = useRef(false)
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
      layoutAppliedRef.current = false
    }
    edgesRef.current = initialEdges
  }, [initialNodes, initialEdges, setNodes, setEdges])

  // Two-pass layout: wait for nodes to be measured, then apply dagre
  useEffect(() => {
    if (nodesInitialized && !layoutAppliedRef.current) {
      setNodes((currentNodes) => {
        if (currentNodes.length === 0) return currentNodes
        const layouted = getLayoutedElements(currentNodes, edgesRef.current, direction)
        layoutAppliedRef.current = true
        requestAnimationFrame(() => {
          fitView({ padding: 0.15, duration: 300 })
        })
        return layouted
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesInitialized, direction, fitView])

  // Manual relayout (e.g. after direction toggle or node expand)
  const relayout = useCallback(() => {
    setNodes((currentNodes) => {
      const layouted = getLayoutedElements(currentNodes, edgesRef.current, direction)
      requestAnimationFrame(() => {
        fitView({ padding: 0.15, duration: 300 })
      })
      return layouted
    })
  }, [direction, fitView, setNodes])

  return { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, relayout }
}
