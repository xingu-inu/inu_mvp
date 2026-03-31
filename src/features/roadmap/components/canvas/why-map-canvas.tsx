'use client'

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
  useState,
  type CSSProperties,
} from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  useReactFlow,
  useViewport,
  type Connection,
  type Edge,
} from '@xyflow/react'
import { ArrowRight, ArrowDown, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { CanvasChip } from './canvas-chip'
import { CanvasToolbar } from './canvas-toolbar'
import { useRoadmapStore } from '@/stores/roadmap.store'
import type { VisualTreeNode } from '../visual-tree/tree-node-card'
import type { CrossLink } from '../cross-link-overlay'
import type { Area, Goal } from '@/types/entities'
import type { TreeLayoutDirection } from '@/stores/roadmap.store'
import type { WhyMapNode, WhyMapEdge, DependencyEdgeData } from './types'
import { ZOOM_THRESHOLD_COMPACT, ZOOM_THRESHOLD_FULL } from './types'

import { treeToFlowElements } from './tree-to-flow'
import { useDagreLayout } from './use-dagre-layout'
import { useCanvasInteractions } from './use-canvas-interactions'
import { CanvasInteractionsContext } from './canvas-interactions-context'
import { nodeTypes } from './nodes'
import { edgeTypes } from './edges'
import { AreaRegions } from './area-regions'
import { useCanvasKeyboard } from './use-canvas-keyboard'

// ── Public ref API ─────────────────────────────────────────

export interface WhyMapCanvasRef {
  focusNode: (nodeId: string) => void
  fitView: () => void
  toggleMinimap: () => void
}

// ── Props ──────────────────────────────────────────────────

interface WhyMapCanvasProps {
  treeData: VisualTreeNode | null
  crossLinks: CrossLink[]
  goals: Goal[]
  areas: Area[]
  treeLayout: TreeLayoutDirection
  searchQuery: string
  searchMatchedIds: Set<string>
}

// ── MiniMap node color ──────────────────────────────────────

function minimapNodeColor(node: WhyMapNode): string {
  switch (node.type) {
    case 'direction':
      return '#6366f1' // indigo
    case 'area':
      return '#8b5cf6' // violet
    case 'goal':
      return '#3b82f6' // blue
    case 'group':
      return '#10b981' // emerald
    case 'task':
      return '#64748b' // slate
    default:
      return '#64748b'
  }
}

// ── Outer wrapper (provides ReactFlowProvider) ─────────────

export const WhyMapCanvas = forwardRef<WhyMapCanvasRef, WhyMapCanvasProps>(
  function WhyMapCanvas(props, ref) {
    return (
      <ReactFlowProvider>
        <WhyMapCanvasInner {...props} ref={ref} />
      </ReactFlowProvider>
    )
  }
)

// ── Inner component (uses ReactFlow hooks) ─────────────────

const WhyMapCanvasInner = forwardRef<WhyMapCanvasRef, WhyMapCanvasProps>(function WhyMapCanvasInner(
  { treeData, crossLinks, goals, areas, treeLayout, searchQuery, searchMatchedIds },
  ref
) {
  const clearSelection = useRoadmapStore((s) => s.clearSelection)
  const { fitView, zoomIn, zoomOut } = useReactFlow()
  const { zoom: rawZoom } = useViewport()
  // Quantize zoom into 3 bands so enrichedNodes only recomputes at threshold crossings
  const zoomBand: number =
    rawZoom < ZOOM_THRESHOLD_COMPACT ? 0 : rawZoom > ZOOM_THRESHOLD_FULL ? 2 : 1
  const [isMinimapVisible, setIsMinimapVisible] = useState(false)

  // Interaction logic (selection, delete, quick-add, focus)
  const interactions = useCanvasInteractions(treeData, goals, areas)
  const { selectedNodeId, focusedIds, parentGoalMap, parentGroupMap } = interactions

  // Goal expand/collapse: which goals show Group/Task as canvas nodes
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set())
  // Group expand/collapse: which groups show Task children as canvas nodes
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set())

  // Clear expanded group IDs that belong to a given goal
  const clearChildGroupExpands = useCallback(
    (goalId: string) => {
      setExpandedGroupIds((prev) => {
        if (prev.size === 0) return prev
        const next = new Set(prev)
        for (const groupId of prev) {
          if (parentGoalMap.get(groupId) === goalId) next.delete(groupId)
        }
        return next.size === prev.size ? prev : next
      })
    },
    [parentGoalMap]
  )

  const toggleGoalExpand = useCallback(
    (goalId: string) => {
      setExpandedGoalIds((prev) => {
        const next = new Set(prev)
        if (next.has(goalId)) {
          next.delete(goalId)
          clearChildGroupExpands(goalId)
        } else {
          next.add(goalId)
        }
        return next
      })
    },
    [clearChildGroupExpands]
  )

  const expandGoal = useCallback((goalId: string) => {
    setExpandedGoalIds((prev) => {
      if (prev.has(goalId)) return prev
      const next = new Set(prev)
      next.add(goalId)
      return next
    })
  }, [])

  const collapseGoal = useCallback(
    (goalId: string) => {
      setExpandedGoalIds((prev) => {
        if (!prev.has(goalId)) return prev
        const next = new Set(prev)
        next.delete(goalId)
        return next
      })
      clearChildGroupExpands(goalId)
    },
    [clearChildGroupExpands]
  )

  const toggleGroupExpand = useCallback((groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  // Dependency edges (user-created Goal↔Goal relations, not in dagre layout)
  const [dependencyEdges, setDependencyEdges] = useState<WhyMapEdge[]>([])

  const interactionsContextValue = useMemo(
    () => ({ ...interactions, toggleGoalExpand, toggleGroupExpand }),
    [interactions, toggleGoalExpand, toggleGroupExpand]
  )

  // ── Data pipeline: tree → flow elements → enrich → dagre ──

  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () => treeToFlowElements(treeData, crossLinks, expandedGoalIds, expandedGroupIds),
    [treeData, crossLinks, expandedGoalIds, expandedGroupIds]
  )

  // Enrich nodes with interaction state
  const enrichedNodes = useMemo(() => {
    return rawNodes.map((node) => {
      const isSelected = node.id === selectedNodeId
      const isSearchMatch = searchMatchedIds.has(node.id)

      // Focus/dim logic
      let style: CSSProperties | undefined
      if (focusedIds) {
        style = focusedIds.has(node.id)
          ? { opacity: 1, transition: 'opacity 0.2s' }
          : { opacity: 0.15, transition: 'opacity 0.2s', pointerEvents: 'none' as const }
      }

      return {
        ...node,
        data: {
          ...node.data,
          isSelected,
          isSearchMatch,
          searchQuery: isSearchMatch ? searchQuery : undefined,
          zoomLevel: zoomBand,
        },
        style,
        selected: isSelected,
      }
    })
  }, [rawNodes, selectedNodeId, focusedIds, searchMatchedIds, searchQuery, zoomBand])

  // Merge dependency edges with raw edges, then apply focus dimming
  const allEdges = useMemo(() => [...rawEdges, ...dependencyEdges], [rawEdges, dependencyEdges])

  const enrichedEdges = useMemo(() => {
    if (!focusedIds) return allEdges
    return allEdges.map((edge) => {
      const isRelevant = focusedIds.has(edge.source) && focusedIds.has(edge.target)
      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: isRelevant ? 1 : 0.1,
          transition: 'opacity 0.2s',
        },
      }
    })
  }, [allEdges, focusedIds])

  const direction = treeLayout === 'horizontal' ? 'LR' : 'TB'
  const { nodes, edges, onNodesChange, onEdgesChange } = useDagreLayout(
    enrichedNodes as WhyMapNode[],
    enrichedEdges,
    direction
  )

  // ── Keyboard shortcuts ────────────────────────────────────

  // Unified expand/collapse dispatchers — route by node type
  const resolveNodeType = useCallback(
    (nodeId: string) => nodes.find((n) => n.id === nodeId)?.type,
    [nodes]
  )

  const toggleNodeExpand = useCallback(
    (nodeId: string) => {
      const type = resolveNodeType(nodeId)
      if (type === 'goal') toggleGoalExpand(nodeId)
      else if (type === 'group') toggleGroupExpand(nodeId)
    },
    [resolveNodeType, toggleGoalExpand, toggleGroupExpand]
  )

  const expandNode = useCallback(
    (nodeId: string) => {
      const type = resolveNodeType(nodeId)
      if (type === 'goal') expandGoal(nodeId)
      else if (type === 'group') {
        setExpandedGroupIds((prev) => {
          if (prev.has(nodeId)) return prev
          const next = new Set(prev)
          next.add(nodeId)
          return next
        })
      }
    },
    [resolveNodeType, expandGoal]
  )

  const collapseNode = useCallback(
    (nodeId: string) => {
      const type = resolveNodeType(nodeId)
      if (type === 'goal') collapseGoal(nodeId)
      else if (type === 'group') {
        setExpandedGroupIds((prev) => {
          if (!prev.has(nodeId)) return prev
          const next = new Set(prev)
          next.delete(nodeId)
          return next
        })
      }
    },
    [resolveNodeType, collapseGoal]
  )

  useCanvasKeyboard({
    nodes,
    edges,
    selectedNodeId,
    direction,
    handleQuickCreate: interactions.handleQuickCreate,
    handleNodeSelect: interactions.handleNodeSelect,
    handleDeleteNode: interactions.handleDeleteNode,
    toggleNodeExpand,
    expandNode,
    collapseNode,
    clearSelection,
    onToggleFloatingPanel: useRoadmapStore.getState().toggleFloatingPanel,
    onFitView: () => fitView({ padding: 0.15, duration: 300 }),
  })

  // ── Event handlers ─────────────────────────────────────────

  const handlePaneClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  // ── Imperative ref for parent ──────────────────────────────

  useImperativeHandle(
    ref,
    () => ({
      focusNode: (nodeId: string) => {
        // If node is visible, focus it directly
        if (nodes.some((n) => n.id === nodeId)) {
          fitView({ nodes: [{ id: nodeId }], padding: 0.5, duration: 300 })
          return
        }

        // Node not visible — auto-expand ancestors so it becomes visible
        const goalId = parentGoalMap.get(nodeId)
        if (!goalId) return

        expandGoal(goalId)
        const groupId = parentGroupMap.get(nodeId)
        if (groupId) {
          setExpandedGroupIds((prev) => {
            if (prev.has(groupId)) return prev
            const next = new Set(prev)
            next.add(groupId)
            return next
          })
        }

        // Wait for next render so the node exists, then focus it
        requestAnimationFrame(() => {
          fitView({ nodes: [{ id: nodeId }], padding: 0.5, duration: 300 })
        })
      },
      fitView: () => {
        fitView({ padding: 0.15, duration: 300 })
      },
      toggleMinimap: () => setIsMinimapVisible((prev) => !prev),
    }),
    [nodes, parentGoalMap, parentGroupMap, expandGoal, fitView]
  )

  // ── Dependency edge: onConnect handler (Goal↔Goal only) ──

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      // Only allow Goal↔Goal connections
      const sourceNode = rawNodes.find((n) => n.id === connection.source)
      const targetNode = rawNodes.find((n) => n.id === connection.target)
      if (sourceNode?.type !== 'goal' || targetNode?.type !== 'goal') return

      const src = connection.source
      const tgt = connection.target
      const newEdge: Edge<DependencyEdgeData> = {
        id: `dep-${src}-${tgt}`,
        source: src,
        target: tgt,
        type: 'dependency',
        data: { edgeType: 'dependency', relation: 'depends-on' },
      }

      setDependencyEdges((prev) => {
        // Prevent duplicate (both directions)
        if (
          prev.some(
            (e) => (e.source === src && e.target === tgt) || (e.source === tgt && e.target === src)
          )
        )
          return prev
        return [...prev, newEdge as WhyMapEdge]
      })
    },
    [rawNodes]
  )

  // ── Canvas stats ───────────────────────────────────────────

  const canvasStats = useMemo(() => {
    const goalNodes = rawNodes.filter(
      (n): n is Extract<WhyMapNode, { type: 'goal' }> => n.type === 'goal'
    )
    const totalGoals = goalNodes.length
    if (totalGoals === 0) return null

    let activeCount = 0
    let completedCount = 0
    for (const n of goalNodes) {
      const status = n.data.treeNode.status ?? 'active'
      if (status === 'active' || status === 'maintenance') activeCount++
      else if (status === 'completed') completedCount++
    }
    const completionRate = (completedCount / totalGoals) * 100
    return { totalGoals, activeCount, completedCount, completionRate }
  }, [rawNodes])

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="absolute inset-0">
      <CanvasInteractionsContext.Provider value={interactionsContextValue}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onPaneClick={handlePaneClick}
          panOnScroll
          zoomOnScroll
          panOnDrag
          snapToGrid
          snapGrid={[20, 20]}
          minZoom={0.15}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <AreaRegions />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          {isMinimapVisible && (
            <MiniMap nodeColor={minimapNodeColor} maskColor="rgba(0,0,0,0.08)" pannable zoomable />
          )}
          {/* Canvas controls — bottom-left */}
          <Panel position="bottom-left" className="!mb-3 !ml-3">
            <CanvasToolbar className="gap-1 rounded-xl p-1.5">
              <CanvasToolbar.Button
                className="rounded-lg px-3 py-2.5 text-sm"
                icon={<ZoomIn className="h-5 w-5" />}
                onClick={() => zoomIn({ duration: 200 })}
                title="확대"
              />
              <CanvasToolbar.Button
                className="rounded-lg px-3 py-2.5 text-sm"
                icon={<ZoomOut className="h-5 w-5" />}
                onClick={() => zoomOut({ duration: 200 })}
                title="축소"
              />
              <CanvasToolbar.Button
                className="rounded-lg px-3 py-2.5 text-sm"
                icon={<Maximize2 className="h-5 w-5" />}
                onClick={() => fitView({ padding: 0.15, duration: 300 })}
                title="전체 보기 (⌘0)"
              />
              <CanvasToolbar.Divider className="mx-1 h-5" />
              <CanvasToolbar.Button
                className="rounded-lg px-3 py-2.5 text-sm"
                icon={
                  direction === 'LR' ? (
                    <ArrowRight className="h-5 w-5" />
                  ) : (
                    <ArrowDown className="h-5 w-5" />
                  )
                }
                onClick={() => {
                  const next = treeLayout === 'horizontal' ? 'vertical' : 'horizontal'
                  useRoadmapStore.getState().setTreeLayout(next)
                }}
                title="레이아웃 전환 (L)"
              >
                {direction === 'LR' ? '가로' : '세로'}
              </CanvasToolbar.Button>
            </CanvasToolbar>
          </Panel>
          {/* Canvas stats */}
          {canvasStats && (
            <Panel position="bottom-center" className="!mb-2">
              <CanvasChip variant="info" className="gap-3">
                <span>{canvasStats.totalGoals} goals</span>
                <span className="text-[var(--color-done)]">{canvasStats.completedCount} done</span>
                <span>{canvasStats.activeCount} active</span>
                <span>{Math.round(canvasStats.completionRate)}%</span>
              </CanvasChip>
            </Panel>
          )}
        </ReactFlow>
      </CanvasInteractionsContext.Provider>
    </div>
  )
})
