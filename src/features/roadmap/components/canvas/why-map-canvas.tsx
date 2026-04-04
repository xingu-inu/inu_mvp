'use client'

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
  useState,
  useRef,
  type CSSProperties,
} from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  ViewportPortal,
  useReactFlow,
  useViewport,
  type Connection,
  type Edge,
} from '@xyflow/react'
import { ArrowRight, ArrowDown, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { CanvasToolbar } from './canvas-toolbar'
import { useRoadmapStore } from '@/stores/roadmap.store'
import type { VisualTreeNode } from '../visual-tree/tree-node-card'
import type { CrossLink } from '../cross-link-overlay'
import type { Area, Goal } from '@/types/entities'
import type { TreeLayoutDirection, SelectedNodeType } from '@/stores/roadmap.store'
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
import { useCanvasReorder } from './use-canvas-reorder'
import { useAutoPan } from './dnd/use-auto-pan'
import { useBrainDumpPreviewStore } from '@/stores/brain-dump-preview.store'
import { injectGhostNodes } from './inject-ghost-nodes'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const clearSelection = useRoadmapStore((s) => s.clearSelection)
  const { fitView, zoomIn, zoomOut } = useReactFlow()
  const { zoom: rawZoom } = useViewport()
  // Quantize zoom into 3 bands so enrichedNodes only recomputes at threshold crossings
  const zoomBand: number =
    rawZoom < ZOOM_THRESHOLD_COMPACT ? 0 : rawZoom > ZOOM_THRESHOLD_FULL ? 2 : 1
  const [isMinimapVisible, setIsMinimapVisible] = useState(false)

  // Drag reorder state — lifted here to feed both dagre guard and enrichedNodes
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  // Cross-parent drop target highlight
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  // Ghost node preview state
  const ghostProposal = useBrainDumpPreviewStore((s) => s.proposal)
  const ghostCheckedItems = useBrainDumpPreviewStore((s) => s.checkedItems)
  const isGhostPulsing = useBrainDumpPreviewStore((s) => s.isPulsing)

  // Goal expand/collapse: which goals show Group/Task as canvas nodes
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set())
  // Group expand/collapse: which groups show Task children as canvas nodes
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set())

  const expandGoal = useCallback((goalId: string) => {
    setExpandedGoalIds((prev) => {
      if (prev.has(goalId)) return prev
      const next = new Set(prev)
      next.add(goalId)
      return next
    })
  }, [])

  const expandGroup = useCallback((groupId: string) => {
    setExpandedGroupIds((prev) => {
      if (prev.has(groupId)) return prev
      const next = new Set(prev)
      next.add(groupId)
      return next
    })
  }, [])

  // Interaction logic (selection, delete, quick-add, focus)
  const interactions = useCanvasInteractions(treeData, goals, areas, expandGoal, expandGroup)
  const { selectedNodeId, focusedIds, parentGoalMap, parentGroupMap, handleStartEdit } =
    interactions

  // Clear expanded group IDs that belong to a given goal.
  // Safe: expandedGroupIds only contains group IDs, and parentGoalMap maps
  // both group and task IDs to their parent goal — but we only iterate group IDs here.
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

  // ── Data pipeline: tree → flow elements → ghost inject → enrich → dagre ──

  const { nodes: treeNodes, edges: treeEdges } = useMemo(
    () => treeToFlowElements(treeData, crossLinks, expandedGoalIds, expandedGroupIds),
    [treeData, crossLinks, expandedGoalIds, expandedGroupIds]
  )

  // Inject ghost nodes from brain-dump proposal
  const { nodes: rawNodes, edges: rawEdges } = useMemo(() => {
    if (!ghostProposal || !treeData) return { nodes: treeNodes, edges: treeEdges }
    return injectGhostNodes(treeNodes, treeEdges, ghostProposal, ghostCheckedItems, treeData.id)
  }, [treeNodes, treeEdges, ghostProposal, ghostCheckedItems, treeData])

  // Enrich nodes with interaction state
  const enrichedNodes = useMemo(() => {
    return rawNodes.map((node) => {
      const isGhost = node.data.isGhost === true
      const isSelected = node.id === selectedNodeId
      const isSearchMatch = searchMatchedIds.has(node.id)
      const isDropTargetNode = dropTargetId === node.id

      // Focus/dim logic
      let style: CSSProperties | undefined
      if (focusedIds) {
        style = focusedIds.has(node.id)
          ? { opacity: 1, transition: 'opacity 0.2s' }
          : { opacity: 0.15, transition: 'opacity 0.2s', pointerEvents: 'none' as const }
      }

      // Ghost node opacity override
      if (isGhost && !style) {
        style = { opacity: 0.6, transition: 'opacity 0.3s' }
      }

      // Drag visual feedback
      if (node.id === draggingNodeId) {
        style = {
          ...style,
          opacity: 1,
          zIndex: 1000,
          transform: 'scale(1.04)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
          willChange: 'transform',
          transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        }
      }

      return {
        ...node,
        data: {
          ...node.data,
          isSelected,
          isSearchMatch,
          searchQuery: isSearchMatch ? searchQuery : undefined,
          zoomLevel: zoomBand,
          isGhostPulsing: isGhost ? isGhostPulsing : undefined,
          isDropTarget: isDropTargetNode || undefined,
        },
        style,
        selected: isSelected,
        draggable: node.type !== 'direction' && !isGhost,
      }
    })
  }, [
    rawNodes,
    selectedNodeId,
    focusedIds,
    searchMatchedIds,
    searchQuery,
    zoomBand,
    draggingNodeId,
    dropTargetId,
    isGhostPulsing,
  ])

  // Merge dependency edges with raw edges, then apply focus dimming
  const allEdges = useMemo(() => [...rawEdges, ...dependencyEdges], [rawEdges, dependencyEdges])

  const enrichedEdges = useMemo(() => {
    return allEdges.map((edge) => {
      // During any drag, dim unrelated edges for visual clarity
      if (draggingNodeId) {
        const edgeType = edge.data?.edgeType
        const isRelated = edge.source === draggingNodeId || edge.target === draggingNodeId

        if (edgeType === 'hierarchy') {
          if (isRelated) {
            // Cross-parent drag: dim existing parent→drag hierarchy edge
            if (dropTargetId && edge.target === draggingNodeId) {
              return {
                ...edge,
                style: { ...edge.style, opacity: 0.2, transition: 'opacity 0.2s' },
              }
            }
            // Related hierarchy edges stay full opacity
            return edge
          }
          // Unrelated hierarchy edges → dim
          return {
            ...edge,
            style: { ...edge.style, opacity: 0.3, transition: 'opacity 0.2s' },
          }
        }
        // shared-task, dependency, and other non-hierarchy edges → heavy dim
        return {
          ...edge,
          style: { ...edge.style, opacity: 0.1, transition: 'opacity 0.2s' },
        }
      }

      if (focusedIds) {
        const isRelevant = focusedIds.has(edge.source) && focusedIds.has(edge.target)
        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: isRelevant ? 1 : 0.1,
            transition: 'opacity 0.2s',
          },
        }
      }
      return edge
    })
  }, [allEdges, focusedIds, draggingNodeId, dropTargetId])

  const direction = treeLayout === 'horizontal' ? 'LR' : 'TB'
  const { nodes, edges, setNodes, onNodesChange, onEdgesChange, relayout } = useDagreLayout(
    enrichedNodes as WhyMapNode[],
    enrichedEdges,
    direction,
    draggingNodeId
  )

  // ── Drag reorder ───────────────────────────────────────────

  const canvasReorder = useCanvasReorder({
    nodes,
    edges,
    direction,
    setNodes,
    setDraggingNodeId,
    setDropTargetId,
    editingNodeId: interactions.editingNodeId,
    relayout,
  })

  // Auto-pan when dragging near canvas edges
  const autoPan = useAutoPan({ containerRef, enabled: !!draggingNodeId })

  // Read dragGhost from ref (re-reads when draggingNodeId state changes)
  const dragGhost = draggingNodeId ? canvasReorder.dragGhostRef.current : null

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
      else if (type === 'group') expandGroup(nodeId)
    },
    [resolveNodeType, expandGoal, expandGroup]
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
    handleStartEdit,
    handleDeleteNode: interactions.handleDeleteNode,
    toggleNodeExpand,
    expandNode,
    collapseNode,
    clearSelection,
    cancelDrag: canvasReorder.cancelDrag,
    onToggleFloatingPanel: useRoadmapStore.getState().toggleFloatingPanel,
    onFitView: () => fitView({ padding: 0.15, duration: 300 }),
  })

  // ── Event handlers ─────────────────────────────────────────

  const handlePaneClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: WhyMapNode) => {
      if (node.type === 'direction') return
      handleStartEdit(node.type as SelectedNodeType, node.id)
    },
    [handleStartEdit]
  )

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
        if (groupId) expandGroup(groupId)

        // Wait for dagre layout recalculation + node positioning
        setTimeout(() => {
          fitView({ nodes: [{ id: nodeId }], padding: 0.5, duration: 300 })
        }, 400)
      },
      fitView: () => {
        fitView({ padding: 0.15, duration: 300 })
      },
      toggleMinimap: () => setIsMinimapVisible((prev) => !prev),
    }),
    [nodes, parentGoalMap, parentGroupMap, expandGoal, expandGroup, fitView]
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

  // ── Render ─────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="absolute inset-0">
      {/* Transition for sibling slot swaps during drag reorder */}
      <style>{'.react-flow__node.reordering { transition: transform 140ms ease-out; }'}</style>
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
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeDragStart={canvasReorder.onNodeDragStart}
          onNodeDrag={(event, node) => {
            canvasReorder.onNodeDrag(event, node)
            autoPan.updateMousePosition(event.clientX, event.clientY)
          }}
          onNodeDragStop={canvasReorder.onNodeDragStop}
          panOnScroll
          zoomOnScroll
          panOnDrag={[1, 2]}
          nodesDraggable
          snapToGrid
          snapGrid={[20, 20]}
          minZoom={0.15}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          {/* Dashed edge preview: drag node → drop target during cross-parent drag */}
          {draggingNodeId &&
            dropTargetId &&
            (() => {
              const dragNode = nodes.find((n) => n.id === draggingNodeId)
              const targetNode = nodes.find((n) => n.id === dropTargetId)
              if (!dragNode || !targetNode) return null
              const dw = dragNode.measured?.width ?? 200
              const dh = dragNode.measured?.height ?? 60
              const tw = targetNode.measured?.width ?? 200
              const th = targetNode.measured?.height ?? 60
              const x1 = dragNode.position.x + dw / 2
              const y1 = dragNode.position.y + dh / 2
              const x2 = targetNode.position.x + tw / 2
              const y2 = targetNode.position.y + th / 2
              return (
                <ViewportPortal>
                  <svg
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      overflow: 'visible',
                    }}
                  >
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="var(--color-primary-400)"
                      strokeDasharray="6 4"
                      strokeWidth={2}
                      opacity={0.6}
                    />
                  </svg>
                </ViewportPortal>
              )
            })()}
          {/* Ghost placeholder at original position during drag */}
          {dragGhost && (
            <ViewportPortal>
              <div
                style={{
                  position: 'absolute',
                  left: dragGhost.x,
                  top: dragGhost.y,
                  width: dragGhost.width,
                  height: dragGhost.height,
                  opacity: 0.2,
                  border: '2px dashed var(--color-border)',
                  borderRadius: 12,
                  pointerEvents: 'none',
                  transition: 'opacity 0.2s ease',
                }}
              />
            </ViewportPortal>
          )}
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
        </ReactFlow>
      </CanvasInteractionsContext.Provider>
    </div>
  )
})
