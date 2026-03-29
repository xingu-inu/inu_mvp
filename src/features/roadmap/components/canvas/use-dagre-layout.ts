import { useEffect, useCallback, useRef, useState } from 'react'
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
  direction: { width: 360, height: 120 },
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
  const needsLayoutRef = useRef(true)
  const [layoutVersion, setLayoutVersion] = useState(0)
  const edgesRef = useRef(initialEdges)
  const directionAnchorRef = useRef<{ x: number; y: number; direction: 'TB' | 'LR' } | null>(null)
  const isFirstLayoutRef = useRef(true)
  const { fitView } = useReactFlow()

  // Track the previous initialNodes/initialEdges identity to detect data changes
  const prevInitialRef = useRef({ nodes: initialNodes, edges: initialEdges })

  // Sync when upstream data identity changes
  useEffect(() => {
    if (
      prevInitialRef.current.nodes !== initialNodes ||
      prevInitialRef.current.edges !== initialEdges
    ) {
      // Detect structural change (nodes added/removed) vs cosmetic change (selection, zoom)
      const prevIds = prevInitialRef.current.nodes.map((n) => n.id).join(',')
      const newIds = initialNodes.map((n) => n.id).join(',')
      const structureChanged = prevIds !== newIds

      prevInitialRef.current = { nodes: initialNodes, edges: initialEdges }

      // Preserve existing node positions so nodes don't flash to {x:0,y:0}
      setNodes((currentNodes) => {
        const posMap = new Map(currentNodes.map((n) => [n.id, n.position]))
        return initialNodes.map((n) => ({
          ...n,
          position: posMap.get(n.id) ?? n.position,
        }))
      })
      setEdges(initialEdges)

      // Only trigger dagre relayout when structure changes (expand/collapse),
      // not for cosmetic updates (selection, zoom band, search highlight)
      if (structureChanged) {
        needsLayoutRef.current = true
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: trigger dagre relayout when tree structure changes
        setLayoutVersion((v) => v + 1)
      }
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

        // Anchor Direction node: keep it at the same position across relayouts
        const dirNode = layouted.find((n) => n.type === 'direction')
        if (dirNode) {
          const anchor = directionAnchorRef.current
          if (anchor && anchor.direction === direction) {
            const dx = anchor.x - dirNode.position.x
            const dy = anchor.y - dirNode.position.y
            for (const node of layouted) {
              node.position = {
                x: node.position.x + dx,
                y: node.position.y + dy,
              }
            }
          }
          directionAnchorRef.current = {
            x: dirNode.position.x,
            y: dirNode.position.y,
            direction,
          }
        }

        // Only fitView on initial layout; subsequent relayouts keep viewport stable
        if (isFirstLayoutRef.current) {
          isFirstLayoutRef.current = false
          requestAnimationFrame(() => {
            fitView({ padding: 0.15, duration: 300 })
          })
        }
        return layouted
      })
    }
  }, [nodesInitialized, layoutVersion, direction, fitView, setNodes])

  // Manual relayout (e.g. after direction toggle or node expand)
  const relayout = useCallback(() => {
    needsLayoutRef.current = true
    // Trigger re-evaluation by forcing a nodes update
    setNodes((n) => [...n])
  }, [setNodes])

  return { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, relayout }
}
