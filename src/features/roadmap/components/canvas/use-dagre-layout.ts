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
  direction: { width: 280, height: 90 },
  area: { width: 200, height: 50 },
  goal: { width: 220, height: 64 },
  group: { width: 180, height: 48 },
  task: { width: 160, height: 40 },
  sticky: { width: 180, height: 100 },
}

function getLayoutedElements(
  nodes: WhyMapNode[],
  edges: WhyMapEdge[],
  direction: 'TB' | 'LR',
  draggingNodeId?: string | null
): WhyMapNode[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 24, ranksep: 48, edgesep: 10 })

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

  // Post-process: enforce sort_order among siblings on spread axis.
  // Dagre's barycenter heuristic can reorder siblings; we need spatial order = sort_order.
  // When swapping sibling positions, shift their entire subtrees to keep the layout intact.
  const spreadAxis = direction === 'TB' ? 'x' : 'y'
  const childrenByParent = new Map<string, string[]>()
  for (const edge of edges) {
    if (edge.data?.edgeType === 'hierarchy') {
      const children = childrenByParent.get(edge.source) ?? []
      children.push(edge.target)
      childrenByParent.set(edge.source, children)
    }
  }

  function getDescendants(nodeId: string, visited = new Set<string>()): string[] {
    const result: string[] = []
    for (const child of childrenByParent.get(nodeId) ?? []) {
      if (visited.has(child)) continue
      visited.add(child)
      result.push(child)
      result.push(...getDescendants(child, visited))
    }
    return result
  }

  // BFS order: process parents root→leaf so upper shifts are finalized before lower ones
  const parentQueue: string[] = []
  const allTargets = new Set(
    edges.filter((e) => e.data?.edgeType === 'hierarchy').map((e) => e.target)
  )
  for (const pid of childrenByParent.keys()) {
    if (!allTargets.has(pid)) parentQueue.push(pid)
  }
  const queued = new Set<string>(parentQueue)
  for (let i = 0; i < parentQueue.length; i++) {
    for (const child of childrenByParent.get(parentQueue[i]) ?? []) {
      if (childrenByParent.has(child) && !queued.has(child)) {
        queued.add(child)
        parentQueue.push(child)
      }
    }
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  for (const parentId of parentQueue) {
    const childIds = childrenByParent.get(parentId)
    if (!childIds || childIds.length <= 1) continue
    const centerPositions = childIds.map((id) => g.node(id)[spreadAxis]).sort((a, b) => a - b)
    const sortedIds = [...childIds].sort((a, b) => {
      const aOrder = nodeMap.get(a)?.data?.treeNode?.meta?.sortOrder ?? ''
      const bOrder = nodeMap.get(b)?.data?.treeNode?.meta?.sortOrder ?? ''
      return aOrder.localeCompare(bOrder)
    })
    for (let i = 0; i < sortedIds.length; i++) {
      const id = sortedIds[i]
      const dagreNode = g.node(id)
      const delta = centerPositions[i] - dagreNode[spreadAxis]
      if (delta === 0) continue
      dagreNode[spreadAxis] = centerPositions[i]
      for (const descId of getDescendants(id)) {
        const desc = g.node(descId)
        if (desc) desc[spreadAxis] += delta
      }
    }
  }

  // Post-process: ensure minimum gap between area subtrees to prevent region overlap.
  // Area regions render with PADDING around child bounds; without this step, adjacent
  // area regions can visually overlap when dagre packs subtrees tightly.
  const AREA_REGION_PADDING = 24
  const AREA_GAP = 16
  const areaNodes = nodes.filter((n) => n.type === 'area')

  if (areaNodes.length > 1) {
    interface AreaBounds {
      areaId: string
      min: number
      max: number
    }
    const areaBounds: AreaBounds[] = []

    for (const areaNode of areaNodes) {
      const subtreeIds = [areaNode.id, ...getDescendants(areaNode.id)]
      let min = Infinity
      let max = -Infinity

      for (const id of subtreeIds) {
        const dn = g.node(id)
        if (!dn) continue
        const n = nodeMap.get(id)
        const defaults = DEFAULT_DIMENSIONS[n?.type ?? 'goal']
        const size =
          spreadAxis === 'y'
            ? (n?.measured?.height ?? defaults.height)
            : (n?.measured?.width ?? defaults.width)
        const center = dn[spreadAxis]
        min = Math.min(min, center - size / 2)
        max = Math.max(max, center + size / 2)
      }

      if (min !== Infinity) {
        areaBounds.push({ areaId: areaNode.id, min, max })
      }
    }

    // Sort by position on spread axis
    areaBounds.sort((a, b) => a.min - b.min)

    // Iteratively check adjacent pairs and shift until no overlaps remain.
    // Single-pass can miss cascading overlaps with 3+ areas.
    const requiredGap = AREA_REGION_PADDING * 2 + AREA_GAP
    let hasOverlap = true
    let iterations = 0
    const MAX_ITERATIONS = 10

    while (hasOverlap && iterations < MAX_ITERATIONS) {
      hasOverlap = false
      iterations++
      for (let i = 1; i < areaBounds.length; i++) {
        const prev = areaBounds[i - 1]
        const curr = areaBounds[i]
        const actualGap = curr.min - prev.max

        if (actualGap < requiredGap) {
          hasOverlap = true
          const shift = requiredGap - actualGap
          for (let j = i; j < areaBounds.length; j++) {
            const subtreeIds = [areaBounds[j].areaId, ...getDescendants(areaBounds[j].areaId)]
            for (const id of subtreeIds) {
              const dn = g.node(id)
              if (dn) dn[spreadAxis] += shift
            }
            areaBounds[j].min += shift
            areaBounds[j].max += shift
          }
        }
      }
    }
  }

  return nodes.map((node) => {
    // Never override position of a node currently being dragged
    if (draggingNodeId && node.id === draggingNodeId) return node

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
  direction: 'TB' | 'LR',
  draggingNodeId?: string | null
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
  const draggingNodeIdRef = useRef(draggingNodeId)
  const isFirstLayoutRef = useRef(true)
  const { fitView } = useReactFlow()

  useEffect(() => {
    draggingNodeIdRef.current = draggingNodeId
  }, [draggingNodeId])

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

      // Preserve existing node positions and measured dimensions
      setNodes((currentNodes) => {
        const currentMap = new Map(currentNodes.map((n) => [n.id, n]))
        return initialNodes.map((n) => {
          const existing = currentMap.get(n.id)
          return {
            ...n,
            position: existing?.position ?? n.position,
            measured: existing?.measured,
            sourcePosition: existing?.sourcePosition,
            targetPosition: existing?.targetPosition,
          }
        })
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

  // Detect direction change (TB↔LR) — node IDs stay the same so the sync
  // effect above won't flag it as a structural change; handle separately.
  const prevDirectionRef = useRef(direction)
  useEffect(() => {
    if (prevDirectionRef.current !== direction) {
      prevDirectionRef.current = direction
      needsLayoutRef.current = true
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: trigger dagre relayout when layout direction changes
      setLayoutVersion((v) => v + 1)
    }
  }, [direction])

  // Two-pass layout: wait for nodes to be measured, then apply dagre
  useEffect(() => {
    if (nodesInitialized && needsLayoutRef.current) {
      setNodes((currentNodes) => {
        if (currentNodes.length === 0) return currentNodes

        // Guard: skip layout if any node lacks measured dimensions.
        // Dagre would fall back to DEFAULT_DIMENSIONS producing wrong positions,
        // and needsLayoutRef stays true so a corrective pass runs once measured.
        const hasUnmeasured = currentNodes.some((n) => !n.measured?.width || !n.measured?.height)
        if (hasUnmeasured) return currentNodes

        needsLayoutRef.current = false
        const layouted = getLayoutedElements(
          currentNodes,
          edgesRef.current,
          direction,
          draggingNodeIdRef.current
        )

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
