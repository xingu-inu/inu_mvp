'use client'

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
  useState,
  useEffect,
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
  type NodeMouseHandler,
  type Connection,
  type Edge,
} from '@xyflow/react'
import { Activity, Loader2, PanelRight } from 'lucide-react'
import { CanvasToolbar } from './canvas-toolbar'
import { CanvasChip } from './canvas-chip'
import { useRoadmapStore, selectIsFloatingPanelOpen } from '@/stores/roadmap.store'
import { useStickyNotesStore } from '@/stores/sticky-notes.store'
import type { VisualTreeNode } from '../visual-tree/tree-node-card'
import type { CrossLink } from '../cross-link-overlay'
import type { Area, Goal } from '@/types/entities'
import type { TreeLayoutDirection } from '@/stores/roadmap.store'
import type { WhyMapNode, WhyMapEdge, WhyWalkState, NearbyAreaSuggestion } from './types'
import type { AreaNodeData, DependencyEdgeData } from './types'

import { treeToFlowElements } from './tree-to-flow'
import { useDagreLayout } from './use-dagre-layout'
import { useCanvasInteractions } from './use-canvas-interactions'
import { CanvasInteractionsContext } from './canvas-interactions-context'
import { nodeTypes } from './nodes'
import { edgeTypes } from './edges'
import { AreaRegions } from './area-regions'
import { useCanvasKeyboard } from './use-canvas-keyboard'
import { WhyWalkOverlay, buildWhyWalkSequence } from './why-walk-overlay'
import { useAiBalanceOverlay } from './use-ai-balance-overlay'

// ── Public ref API ─────────────────────────────────────────

export interface WhyMapCanvasRef {
  focusNode: (nodeId: string) => void
  fitView: () => void
  addStickyAtCenter: () => void
  toggleMinimap: () => void
  toggleBalance: () => void
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
  onConvertToGoal: (text: string) => void
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
    case 'sticky':
      return '#fbbf24' // amber
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
  {
    treeData,
    crossLinks,
    goals,
    areas,
    treeLayout,
    searchQuery,
    searchMatchedIds,
    onConvertToGoal,
  },
  ref
) {
  const clearSelection = useRoadmapStore((s) => s.clearSelection)
  const notes = useStickyNotesStore((s) => s.notes)
  const addNote = useStickyNotesStore((s) => s.addNote)
  const updateNote = useStickyNotesStore((s) => s.updateNote)
  const { screenToFlowPosition, fitView } = useReactFlow()
  const { zoom: rawZoom } = useViewport()
  // Quantize zoom into 3 bands so enrichedNodes only recomputes at threshold crossings
  const zoomBand: number = rawZoom < 0.4 ? 0 : rawZoom > 0.8 ? 2 : 1
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

  // Why Walk presentation mode
  const [whyWalkState, setWhyWalkState] = useState<WhyWalkState | null>(null)

  // Brainstorm mode
  const [isBrainstormMode, setIsBrainstormMode] = useState(false)
  const [nearbyAreaSuggestion, setNearbyAreaSuggestion] = useState<NearbyAreaSuggestion | null>(
    null
  )

  // Dependency edges (user-created Goal↔Goal relations, not in dagre layout)
  const [dependencyEdges, setDependencyEdges] = useState<WhyMapEdge[]>([])

  // AI Balance overlay
  const aiBalance = useAiBalanceOverlay(areas, goals, treeData?.why)

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

  // Merge sticky notes as canvas nodes
  const allNodes = useMemo(() => {
    const stickyNodes: WhyMapNode[] = notes.map((note) => ({
      id: `sticky-${note.id}`,
      type: 'sticky' as const,
      position: { x: note.x, y: note.y },
      data: { noteId: note.id, text: note.text, color: note.color, onConvertToGoal },
      draggable: true,
    }))
    return [...rawNodes, ...stickyNodes]
  }, [rawNodes, notes, onConvertToGoal])

  // Enrich nodes with interaction state
  const whyWalkNodeId = whyWalkState?.sequence[whyWalkState.currentIndex]?.nodeId ?? null

  const enrichedNodes = useMemo(() => {
    return allNodes.map((node) => {
      const isSelected = node.id === selectedNodeId
      const isSearchMatch = searchMatchedIds.has(node.id)

      // Focus/dim logic: Why Walk takes priority over focus mode
      let style: CSSProperties | undefined
      if (whyWalkNodeId) {
        style =
          node.id === whyWalkNodeId
            ? { opacity: 1, transition: 'opacity 0.2s' }
            : { opacity: 0.15, transition: 'opacity 0.2s', pointerEvents: 'none' as const }
      } else if (focusedIds) {
        style = focusedIds.has(node.id)
          ? { opacity: 1, transition: 'opacity 0.2s' }
          : { opacity: 0.15, transition: 'opacity 0.2s', pointerEvents: 'none' as const }
      }

      // AI Balance overlay: apply glow for critical, inject warning message
      const overlay = aiBalance.isActive ? aiBalance.overlays.get(node.id) : undefined
      if (overlay?.level === 'critical') {
        style = {
          ...style,
          boxShadow: '0 0 16px rgba(239,68,68,0.5)',
          transition: 'opacity 0.2s, box-shadow 0.3s',
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
          ...(overlay && { balanceWarning: overlay.message, balanceLevel: overlay.level }),
        },
        style,
        selected: isSelected,
      }
    })
  }, [
    allNodes,
    selectedNodeId,
    focusedIds,
    whyWalkNodeId,
    searchMatchedIds,
    searchQuery,
    zoomBand,
    aiBalance.isActive,
    aiBalance.overlays,
  ])

  // Merge dependency edges with raw edges, then apply focus/Why Walk dimming
  const allEdges = useMemo(() => [...rawEdges, ...dependencyEdges], [rawEdges, dependencyEdges])

  const enrichedEdges = useMemo(() => {
    if (!focusedIds && !whyWalkNodeId) return allEdges
    return allEdges.map((edge) => {
      let isRelevant: boolean
      if (whyWalkNodeId) {
        isRelevant = edge.source === whyWalkNodeId || edge.target === whyWalkNodeId
      } else {
        isRelevant = focusedIds ? focusedIds.has(edge.source) && focusedIds.has(edge.target) : true
      }
      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: isRelevant ? 1 : 0.1,
          transition: 'opacity 0.2s',
        },
      }
    })
  }, [allEdges, focusedIds, whyWalkNodeId])

  const direction = treeLayout === 'horizontal' ? 'LR' : 'TB'
  const { nodes, edges, onNodesChange, onEdgesChange } = useDagreLayout(
    enrichedNodes as WhyMapNode[],
    enrichedEdges,
    direction
  )

  // ── Why Walk handlers ────────────────────────────────────

  const handleToggleWhyWalk = useCallback(() => {
    setWhyWalkState((prev) => {
      if (prev?.isActive) {
        // Exiting Why Walk — don't touch brainstorm
        return null
      }
      // Entering Why Walk — clear brainstorm
      setIsBrainstormMode(false)
      setNearbyAreaSuggestion(null)
      const sequence = buildWhyWalkSequence(rawNodes, rawEdges)
      if (sequence.length === 0) return null
      return { isActive: true, currentIndex: 0, sequence }
    })
  }, [rawNodes, rawEdges])

  const handleWhyWalkPrev = useCallback(() => {
    setWhyWalkState((prev) => {
      if (!prev || prev.currentIndex <= 0) return prev
      return { ...prev, currentIndex: prev.currentIndex - 1 }
    })
  }, [])

  const handleWhyWalkNext = useCallback(() => {
    setWhyWalkState((prev) => {
      if (!prev || prev.currentIndex >= prev.sequence.length - 1) return prev
      return { ...prev, currentIndex: prev.currentIndex + 1 }
    })
  }, [])

  // fitView when Why Walk step changes
  useEffect(() => {
    if (!whyWalkNodeId) return
    fitView({ nodes: [{ id: whyWalkNodeId }], padding: 0.5, duration: 600 })
  }, [whyWalkNodeId, fitView])

  // ── Brainstorm mode handlers ─────────────────────────────

  const handleToggleBrainstorm = useCallback(() => {
    setIsBrainstormMode((prev) => !prev)
    // Entering brainstorm clears Why Walk; exiting clears suggestion
    setWhyWalkState((prev) => (prev?.isActive ? null : prev))
    setNearbyAreaSuggestion(null)
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────

  useCanvasKeyboard({
    nodes,
    edges,
    selectedNodeId,
    direction,
    handleStartAdd: interactions.handleStartAdd,
    handleNodeSelect: interactions.handleNodeSelect,
    clearSelection,
    isWhyWalkActive: whyWalkState?.isActive ?? false,
    onToggleWhyWalk: handleToggleWhyWalk,
    onWhyWalkPrev: handleWhyWalkPrev,
    onWhyWalkNext: handleWhyWalkNext,
    isBrainstormMode,
    onToggleBrainstorm: handleToggleBrainstorm,
    onToggleFloatingPanel: useRoadmapStore.getState().toggleFloatingPanel,
  })

  // ── Event handlers ─────────────────────────────────────────

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      // Brainstorm mode: single-click creates sticky
      if (isBrainstormMode) {
        const target = event.target as HTMLElement
        if (target.closest('.react-flow__node')) return
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
        addNote(position.x - 80, position.y - 60)
        return
      }
      clearSelection()
    },
    [isBrainstormMode, screenToFlowPosition, addNote, clearSelection]
  )

  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // Only create sticky note on pane double-click, not on node double-click
      const target = event.target as HTMLElement
      if (target.closest('.react-flow__node')) return
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      addNote(position.x - 80, position.y - 60)
    },
    [screenToFlowPosition, addNote]
  )

  const addStickyAtCenter = useCallback(() => {
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    })
    addNote(center.x - 80, center.y - 60)
  }, [screenToFlowPosition, addNote])

  // ── Imperative ref for parent ──────────────────────────────

  useImperativeHandle(ref, () => ({
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
    addStickyAtCenter,
    toggleMinimap: () => setIsMinimapVisible((prev) => !prev),
    toggleBalance: aiBalance.toggle,
  }))

  const handleNodeDragStop: NodeMouseHandler<WhyMapNode> = useCallback(
    (_event, draggedNode) => {
      // Sync sticky note position back to store
      if (draggedNode.type === 'sticky' && draggedNode.data && 'noteId' in draggedNode.data) {
        updateNote(draggedNode.data.noteId as string, {
          x: draggedNode.position.x,
          y: draggedNode.position.y,
        })

        // Brainstorm mode: detect nearby Area for conversion suggestion (center-based distance)
        if (isBrainstormMode) {
          const stickyW = draggedNode.measured?.width ?? 200
          const stickyH = draggedNode.measured?.height ?? 120
          const stickyCx = draggedNode.position.x + stickyW / 2
          const stickyCy = draggedNode.position.y + stickyH / 2

          const nearbyArea = nodes.find((n) => {
            if (n.type !== 'area') return false
            const aw = n.measured?.width ?? 240
            const ah = n.measured?.height ?? 60
            const areaCx = n.position.x + aw / 2
            const areaCy = n.position.y + ah / 2
            return Math.hypot(areaCx - stickyCx, areaCy - stickyCy) < 150
          })
          if (nearbyArea) {
            setNearbyAreaSuggestion({
              stickyNodeId: draggedNode.id,
              areaId: nearbyArea.id,
              areaName: (nearbyArea.data as AreaNodeData).treeNode.name,
              stickyText: draggedNode.data.text as string,
              stickyPosition: { x: draggedNode.position.x, y: draggedNode.position.y },
            })
          } else {
            setNearbyAreaSuggestion(null)
          }
        }
      }
    },
    [updateNote, isBrainstormMode, nodes]
  )

  // ── Brainstorm suggestion actions ──────────────────────────

  const removeNote = useStickyNotesStore((s) => s.removeNote)

  const handleAcceptSuggestion = useCallback(() => {
    if (!nearbyAreaSuggestion) return
    const noteId = nearbyAreaSuggestion.stickyNodeId.replace('sticky-', '')
    const text = nearbyAreaSuggestion.stickyText
    removeNote(noteId)
    setNearbyAreaSuggestion(null)
    if (text.trim()) onConvertToGoal(text)
  }, [nearbyAreaSuggestion, removeNote, onConvertToGoal])

  const handleDismissSuggestion = useCallback(() => {
    setNearbyAreaSuggestion(null)
  }, [])

  // ── Dependency edge: onConnect handler (Goal↔Goal only) ──

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      // Only allow Goal↔Goal connections
      const sourceNode = allNodes.find((n) => n.id === connection.source)
      const targetNode = allNodes.find((n) => n.id === connection.target)
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
    [allNodes]
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
          onDoubleClick={handlePaneDoubleClick}
          onNodeDragStop={handleNodeDragStop}
          panOnScroll
          zoomOnScroll
          panOnDrag={[1, 2]}
          selectionOnDrag
          panActivationKeyCode="Space"
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
          {/* Canvas stats / Balance summary (hidden during Why Walk since overlay uses same position) */}
          {!whyWalkState?.isActive && (
            <Panel position="bottom-center" className="!mb-2">
              {aiBalance.isActive && aiBalance.diagnosisResult ? (
                <CanvasChip variant="info" className="gap-2">
                  <span>{aiBalance.diagnosisResult.summary.icon}</span>
                  <span className="font-semibold">{aiBalance.diagnosisResult.summary.label}</span>
                  <span className="text-[var(--color-text-tertiary)]">
                    {aiBalance.diagnosisResult.summary.description}
                  </span>
                </CanvasChip>
              ) : canvasStats ? (
                <CanvasChip variant="info" className="gap-3">
                  <span>{canvasStats.totalGoals} goals</span>
                  <span className="text-[var(--color-done)]">
                    {canvasStats.completedCount} done
                  </span>
                  <span>{canvasStats.activeCount} active</span>
                  <span>{Math.round(canvasStats.completionRate)}%</span>
                </CanvasChip>
              ) : null}
            </Panel>
          )}

          {/* Why Walk overlay */}
          {whyWalkState?.isActive && (
            <WhyWalkOverlay
              state={whyWalkState}
              onPrev={handleWhyWalkPrev}
              onNext={handleWhyWalkNext}
              onClose={handleToggleWhyWalk}
            />
          )}

          {/* Canvas top-right toolbar — pushed below floating header */}
          <Panel position="top-right" className="!mt-20 !mr-3">
            <CanvasToolbar className="flex-col">
              <CanvasToolbar.Toggle
                active={aiBalance.isActive}
                icon={
                  aiBalance.isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Activity className="h-3.5 w-3.5" />
                  )
                }
                onClick={aiBalance.toggle}
                title="AI Balance"
              >
                Balance
              </CanvasToolbar.Toggle>
              <CanvasToolbar.Divider className="mx-0 h-px w-full" />
              <PanelToggleButton />
            </CanvasToolbar>
          </Panel>

          {/* Brainstorm mode indicator */}
          {isBrainstormMode && (
            <Panel position="top-left" className="!mt-2 !ml-2">
              <CanvasChip variant="accent">
                <span>Brainstorm</span>
                <span className="text-amber-100">click to add ideas</span>
              </CanvasChip>
            </Panel>
          )}

          {/* Brainstorm: nearby area conversion suggestion */}
          {nearbyAreaSuggestion && (
            <Panel position="top-center" className="!mt-2">
              <CanvasChip variant="action">
                <span>
                  <strong>{nearbyAreaSuggestion.areaName}</strong>에 Goal로 추가?
                </span>
                <button
                  onClick={handleAcceptSuggestion}
                  className="rounded-md bg-[var(--color-primary-500)] px-2 py-0.5 text-white transition-colors hover:bg-[var(--color-primary-600)]"
                >
                  추가
                </button>
                <button
                  onClick={handleDismissSuggestion}
                  className="rounded-md bg-[var(--color-bg-secondary)] px-2 py-0.5 transition-colors hover:bg-[var(--color-bg-tertiary)]"
                >
                  취소
                </button>
              </CanvasChip>
            </Panel>
          )}
        </ReactFlow>
      </CanvasInteractionsContext.Provider>
    </div>
  )
})
