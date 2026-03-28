'use client'

import { forwardRef, useImperativeHandle, useMemo, useCallback, type CSSProperties } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
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

// ── Public ref API ─────────────────────────────────────────

export interface WhyMapCanvasRef {
  focusNode: (nodeId: string) => void
  fitView: () => void
  addStickyAtCenter: () => void
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
    onConvertToGoal: _onConvertToGoal,
  },
  ref
) {
  const clearSelection = useRoadmapStore((s) => s.clearSelection)
  const notes = useStickyNotesStore((s) => s.notes)
  const addNote = useStickyNotesStore((s) => s.addNote)
  const updateNote = useStickyNotesStore((s) => s.updateNote)
  const { screenToFlowPosition } = useReactFlow()

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
      data: { noteId: note.id, text: note.text, color: note.color },
      draggable: true,
    }))
    return [...rawNodes, ...stickyNodes]
  }, [rawNodes, notes])

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

  const direction = treeLayout === 'horizontal' ? 'LR' : 'TB'
  const { nodes, edges, onNodesChange, onEdgesChange } = useDagreLayout(
    enrichedNodes as WhyMapNode[],
    rawEdges,
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

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="absolute inset-0">
      <CanvasInteractionsContext.Provider value={interactions}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
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
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>
      </CanvasInteractionsContext.Provider>
    </div>
  )
})
