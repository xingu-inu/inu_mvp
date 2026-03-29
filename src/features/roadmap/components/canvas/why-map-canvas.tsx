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
  type NodeMouseHandler,
} from '@xyflow/react'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { useStickyNotesStore } from '@/stores/sticky-notes.store'
import type { VisualTreeNode } from '../visual-tree/tree-node-card'
import type { CrossLink } from '../cross-link-overlay'
import type { Area, Goal } from '@/types/entities'
import type { TreeLayoutDirection } from '@/stores/roadmap.store'
import type { WhyMapNode } from './types'

import { treeToFlowElements } from './tree-to-flow'
import { useDagreLayout } from './use-dagre-layout'
import { useCanvasInteractions } from './use-canvas-interactions'
import { CanvasInteractionsContext } from './canvas-interactions-context'
import { nodeTypes } from './nodes'
import { edgeTypes } from './edges'
import { AreaRegions } from './area-regions'

// ── Public ref API ─────────────────────────────────────────

export interface WhyMapCanvasRef {
  focusNode: (nodeId: string) => void
  fitView: () => void
  addStickyAtCenter: () => void
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
    case 'sticky':
      return '#fbbf24' // amber
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
  const { screenToFlowPosition } = useReactFlow()
  const [isMinimapVisible, setIsMinimapVisible] = useState(false)

  // Interaction logic (selection, delete, quick-add, focus)
  const interactions = useCanvasInteractions(treeData, goals, areas)
  const { selectedNodeId, focusedIds, parentGoalMap } = interactions

  // ── Data pipeline: tree → flow elements → enrich → dagre ──

  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () => treeToFlowElements(treeData, crossLinks),
    [treeData, crossLinks]
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
  const enrichedNodes = useMemo(() => {
    return allNodes.map((node) => {
      const isSelected = node.id === selectedNodeId
      const isSearchMatch = searchMatchedIds.has(node.id)

      // Focus mode: dim non-focused nodes
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
        },
        style,
        selected: isSelected,
      }
    })
  }, [allNodes, selectedNodeId, focusedIds, searchMatchedIds, searchQuery])

  // Enrich edges with focus-mode dimming
  const enrichedEdges = useMemo(() => {
    if (!focusedIds) return rawEdges
    return rawEdges.map((edge) => {
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
  }, [rawEdges, focusedIds])

  const direction = treeLayout === 'horizontal' ? 'LR' : 'TB'
  const { nodes, edges, onNodesChange, onEdgesChange } = useDagreLayout(
    enrichedNodes as WhyMapNode[],
    enrichedEdges,
    direction
  )

  // ── Event handlers ─────────────────────────────────────────

  const { fitView } = useReactFlow()

  const handlePaneClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

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
  }))

  const handleNodeDragStop: NodeMouseHandler<WhyMapNode> = useCallback(
    (_event, node) => {
      // Sync sticky note position back to store
      if (node.type === 'sticky' && node.data && 'noteId' in node.data) {
        updateNote(node.data.noteId as string, {
          x: node.position.x,
          y: node.position.y,
        })
      }
    },
    [updateNote]
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
      <CanvasInteractionsContext.Provider value={interactions}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
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
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
        >
          <AreaRegions />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          {isMinimapVisible && (
            <MiniMap nodeColor={minimapNodeColor} maskColor="rgba(0,0,0,0.08)" pannable zoomable />
          )}
          {canvasStats && (
            <Panel position="bottom-center" className="!mb-2">
              <div className="flex items-center gap-3 rounded-lg bg-[var(--color-bg-primary)]/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
                <span>{canvasStats.totalGoals} goals</span>
                <span className="text-[var(--color-done)]">{canvasStats.completedCount} done</span>
                <span>{canvasStats.activeCount} active</span>
                <span>{Math.round(canvasStats.completionRate)}%</span>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </CanvasInteractionsContext.Provider>
    </div>
  )
})
