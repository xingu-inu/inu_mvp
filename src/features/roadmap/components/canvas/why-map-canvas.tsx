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
import { PanelRight } from 'lucide-react'
import { CanvasToolbar } from './canvas-toolbar'
import { CanvasChip } from './canvas-chip'
import { useRoadmapStore, selectIsFloatingPanelOpen } from '@/stores/roadmap.store'
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

// ── Panel toggle button (isolated to avoid canvas re-renders) ──

function PanelToggleButton() {
  const isOpen = useRoadmapStore(selectIsFloatingPanelOpen)
  const toggle = useRoadmapStore((s) => s.toggleFloatingPanel)
  return (
    <CanvasToolbar.Toggle
      active={isOpen}
      icon={<PanelRight className="h-3.5 w-3.5" />}
      onClick={toggle}
      title="패널 토글 (])"
    >
      Panel
    </CanvasToolbar.Toggle>
  )
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
  const { fitView } = useReactFlow()
  const { zoom: rawZoom } = useViewport()
  // Quantize zoom into 3 bands so enrichedNodes only recomputes at threshold crossings
  const zoomBand: number =
    rawZoom < ZOOM_THRESHOLD_COMPACT ? 0 : rawZoom > ZOOM_THRESHOLD_FULL ? 2 : 1
  const [isMinimapVisible, setIsMinimapVisible] = useState(false)

  // Goal expand/collapse: which goals show Group/Task as canvas nodes
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set())

  const toggleGoalExpand = useCallback((goalId: string) => {
    setExpandedGoalIds((prev) => {
      const next = new Set(prev)
      if (next.has(goalId)) next.delete(goalId)
      else next.add(goalId)
      return next
    })
  }, [])

  // Dependency edges (user-created Goal↔Goal relations, not in dagre layout)
  const [dependencyEdges, setDependencyEdges] = useState<WhyMapEdge[]>([])

  // Interaction logic (selection, delete, quick-add, focus)
  const interactions = useCanvasInteractions(treeData, goals, areas)
  const { selectedNodeId, focusedIds, parentGoalMap } = interactions

  const interactionsContextValue = useMemo(
    () => ({ ...interactions, toggleGoalExpand }),
    [interactions, toggleGoalExpand]
  )

  // ── Data pipeline: tree → flow elements → enrich → dagre ──

  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () => treeToFlowElements(treeData, crossLinks, expandedGoalIds),
    [treeData, crossLinks, expandedGoalIds]
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

  useCanvasKeyboard({
    nodes,
    edges,
    selectedNodeId,
    direction,
    handleStartAdd: interactions.handleStartAdd,
    handleNodeSelect: interactions.handleNodeSelect,
    clearSelection,
    onToggleFloatingPanel: useRoadmapStore.getState().toggleFloatingPanel,
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
        // If the nodeId is a group/task, find the parent goal
        let targetId = nodeId
        if (!nodes.some((n) => n.id === nodeId)) {
          const goalId = parentGoalMap.get(nodeId)
          if (goalId) targetId = goalId
        }
        fitView({ nodes: [{ id: targetId }], padding: 0.5, duration: 300 })
      },
      fitView: () => {
        fitView({ padding: 0.15, duration: 300 })
      },
      toggleMinimap: () => setIsMinimapVisible((prev) => !prev),
    }),
    [nodes, parentGoalMap, fitView]
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

          {/* Canvas top-right toolbar — pushed below floating header */}
          <Panel position="top-right" className="!mt-20 !mr-3">
            <CanvasToolbar className="flex-col">
              <PanelToggleButton />
            </CanvasToolbar>
          </Panel>
        </ReactFlow>
      </CanvasInteractionsContext.Provider>
    </div>
  )
})
