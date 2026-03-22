'use client'

import { useMemo, useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useRoadmapStore, type Selection, type SelectedNodeType } from '@/stores/roadmap.store'
import { useCanvasLayoutStore, type NodePosition } from '@/stores/canvas-layout.store'
import { useStickyNotesStore, type StickyNote } from '@/stores/sticky-notes.store'
import { CanvasNode, type CanvasNodeData } from './canvas-node'
import { CanvasStickyNode, type StickyNodeData } from './canvas-sticky-node'
import { CanvasToolbar } from './canvas-toolbar'
import { getLayoutedElements } from './use-canvas-layout'
import type { VisualTreeNode } from '../visual-tree/tree-node-card'
import type { CrossLink } from '../cross-link-overlay'

// ── Node/Edge type registries (stable references — defined outside component) ──

const nodeTypes: NodeTypes = {
  canvas: CanvasNode,
  sticky: CanvasStickyNode,
}

const edgeTypes: EdgeTypes = {}

// ── Tree → ReactFlow conversion ────────────────────────────────────────────────

function flattenTree(
  node: VisualTreeNode,
  parentId: string | null,
  nodes: Node<CanvasNodeData>[],
  edges: Edge[]
) {
  const hasChildren = (node.children?.length ?? 0) > 0

  nodes.push({
    id: node.id,
    type: 'canvas',
    position: { x: 0, y: 0 },
    data: {
      treeNode: node,
      hasChildren,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    },
  })

  if (parentId) {
    edges.push({
      id: `e-${parentId}-${node.id}`,
      source: parentId,
      target: node.id,
      type: 'smoothstep',
      style: { stroke: 'var(--color-border)', strokeWidth: 1.5 },
      animated: false,
    })
  }

  if (node.children) {
    for (const child of node.children) {
      flattenTree(child, node.id, nodes, edges)
    }
  }
}

function buildCrossLinkEdges(crossLinks: CrossLink[]): Edge[] {
  return crossLinks
    .filter((cl) => cl.sourceTaskId || cl.sourceGoalId)
    .map((cl, i) => ({
      id: `cl-${i}-${cl.sourceTaskId ?? cl.sourceGoalId}-${cl.targetNodeId}`,
      source: (cl.sourceTaskId ?? cl.sourceGoalId)!,
      target: cl.targetNodeId,
      type: 'default',
      style: {
        stroke: cl.areaColor,
        strokeWidth: 1.5,
        strokeDasharray: '6 3',
      },
      animated: true,
    }))
}

function convertToCanvasData(
  treeData: VisualTreeNode | null,
  crossLinks: CrossLink[]
): { nodes: Node<CanvasNodeData>[]; edges: Edge[] } {
  if (!treeData) return { nodes: [], edges: [] }

  const nodes: Node<CanvasNodeData>[] = []
  const edges: Edge[] = []
  flattenTree(treeData, null, nodes, edges)

  const crossLinkEdges = buildCrossLinkEdges(crossLinks)
  return { nodes, edges: [...edges, ...crossLinkEdges] }
}

// ── Apply stored or auto-layout positions ──────────────────────────────────────

function applyPositions(
  nodes: Node<CanvasNodeData>[],
  edges: Edge[],
  stored: Record<string, NodePosition>,
  direction: 'TB' | 'LR'
): Node<CanvasNodeData>[] {
  const hasStored = Object.keys(stored).length > 0
  const allHavePositions = hasStored && nodes.every((n) => stored[n.id])

  if (allHavePositions) {
    return nodes.map((n) => ({
      ...n,
      position: stored[n.id],
    }))
  }

  // Auto-layout with Dagre
  const layouted = getLayoutedElements(nodes, edges, direction)

  // For nodes with stored positions, keep them
  if (hasStored) {
    return layouted.map((n) => (stored[n.id] ? { ...n, position: stored[n.id] } : n))
  }

  return layouted
}

// ── Sticky notes → ReactFlow nodes ─────────────────────────────────────────────

function buildStickyNodes(
  notes: StickyNote[],
  onConvertToGoal?: (text: string) => void
): Node<StickyNodeData>[] {
  return notes.map((note) => ({
    id: `sticky-${note.id}`,
    type: 'sticky',
    position: { x: note.x, y: note.y },
    data: { noteId: note.id, text: note.text, color: note.color, onConvertToGoal },
    draggable: true,
  }))
}

// ── Inner component (needs ReactFlowProvider) ──────────────────────────────────

interface CanvasViewInnerProps {
  treeData: VisualTreeNode | null
  crossLinks: CrossLink[]
  parentGoalMap: Map<string, string>
  onConvertToGoal?: (text: string) => void
}

function CanvasViewInner({
  treeData,
  crossLinks,
  parentGoalMap,
  onConvertToGoal,
}: CanvasViewInnerProps) {
  const { fitView, screenToFlowPosition } = useReactFlow()
  const treeLayout = useRoadmapStore((s) => s.treeLayout)
  const select = useRoadmapStore((s) => s.select)
  const focusGoal = useRoadmapStore((s) => s.focusGoal)
  const clearSelection = useRoadmapStore((s) => s.clearSelection)
  const setNodePosition = useCanvasLayoutStore((s) => s.setNodePosition)
  const setBulkPositions = useCanvasLayoutStore((s) => s.setBulkPositions)
  const stickyNotes = useStickyNotesStore((s) => s.notes)
  const addNote = useStickyNotesStore((s) => s.addNote)
  const updateNote = useStickyNotesStore((s) => s.updateNote)
  const initialLayoutDone = useRef(false)

  const direction = treeLayout === 'horizontal' ? 'LR' : 'TB'

  // Convert tree data to ReactFlow format
  const { canvasNodes, canvasEdges } = useMemo(() => {
    const { nodes, edges } = convertToCanvasData(treeData, crossLinks)
    return { canvasNodes: nodes, canvasEdges: edges }
  }, [treeData, crossLinks])

  // Build positioned nodes
  const initialNodes = useMemo(() => {
    const currentPositions = useCanvasLayoutStore.getState().nodePositions
    const positioned = applyPositions(canvasNodes, canvasEdges, currentPositions, direction)
    const stickies = buildStickyNodes(stickyNotes, onConvertToGoal)
    return [...positioned, ...stickies] as Node[]
  }, [canvasNodes, canvasEdges, direction, stickyNotes, onConvertToGoal])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(canvasEdges)

  // Sync when tree data or direction changes
  useEffect(() => {
    const currentPositions = useCanvasLayoutStore.getState().nodePositions
    const positioned = applyPositions(canvasNodes, canvasEdges, currentPositions, direction)
    const stickies = buildStickyNodes(stickyNotes, onConvertToGoal)
    setNodes([...positioned, ...stickies] as Node[])
    setEdges(canvasEdges)
  }, [canvasNodes, canvasEdges, direction, stickyNotes, onConvertToGoal, setNodes, setEdges])

  // Initial fitView
  useEffect(() => {
    if (!initialLayoutDone.current && nodes.length > 0) {
      initialLayoutDone.current = true
      requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }))
    }
  }, [nodes.length, fitView])

  // Node drag end → persist position
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === 'sticky') {
        const noteId = (node.data as StickyNodeData).noteId
        updateNote(noteId, { x: node.position.x, y: node.position.y })
      } else {
        setNodePosition(node.id, node.position.x, node.position.y)
      }
    },
    [setNodePosition, updateNote]
  )

  // Node click → select in roadmap store
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === 'sticky') return

      const treeNode = (node.data as CanvasNodeData).treeNode
      const type = treeNode.type as SelectedNodeType

      if (type === 'goal') {
        focusGoal(treeNode.id)
      } else if (type === 'group') {
        const goalId = parentGoalMap.get(treeNode.id)
        if (goalId) {
          useRoadmapStore.setState({
            selection: { type: 'group', id: treeNode.id, goalId } as Selection,
            focusedGoalId: goalId,
            inlineMode: { type: 'edit-group', groupId: treeNode.id },
          })
        }
      } else if (type === 'task') {
        const goalId = parentGoalMap.get(treeNode.id)
        if (goalId) {
          useRoadmapStore.setState({
            selection: { type: 'task', id: treeNode.id, goalId } as Selection,
            focusedGoalId: goalId,
            inlineMode: { type: 'edit-task', taskId: treeNode.id },
          })
        }
      } else {
        select({ type: type as 'direction' | 'area', id: treeNode.id })
      }
    },
    [focusGoal, select, parentGoalMap]
  )

  // Click on pane (background) → clear selection
  const onPaneClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  // [FIX: CRITICAL] Double-click on pane → add sticky note at correct flow position
  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      addNote(position.x, position.y)
    },
    [addNote, screenToFlowPosition]
  )

  // Add sticky at viewport center (for keyboard shortcut / toolbar)
  const addStickyAtCenter = useCallback(() => {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    })
    addNote(position.x, position.y)
  }, [addNote, screenToFlowPosition])

  // Tidy up (auto-layout)
  const handleTidyUp = useCallback(
    (dir: 'TB' | 'LR') => {
      const treeNodes = nodes.filter((n) => n.type !== 'sticky')
      const layouted = getLayoutedElements(treeNodes as Node[], edges, dir)

      const positions: Record<string, NodePosition> = {}
      for (const n of layouted) {
        positions[n.id] = n.position
      }
      setBulkPositions(positions)

      const stickies = nodes.filter((n) => n.type === 'sticky')
      setNodes([...layouted, ...stickies] as Node[])

      requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }))
    },
    [nodes, edges, setBulkPositions, setNodes, fitView]
  )

  // Minimap node color
  const minimapNodeColor = useCallback((node: Node) => {
    if (node.type === 'sticky') return '#fef08a'
    const treeNode = (node.data as CanvasNodeData)?.treeNode
    if (!treeNode) return '#94a3b8'
    switch (treeNode.type) {
      case 'direction':
        return '#6366f1'
      case 'area':
        return treeNode.color ?? '#8b5cf6'
      case 'goal':
        return treeNode.areaColor ?? '#3b82f6'
      case 'group':
        return '#10b981'
      case 'task':
        return '#94a3b8'
      default:
        return '#94a3b8'
    }
  }, [])

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onDoubleClick={onPaneDoubleClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        snapToGrid
        snapGrid={[20, 20]}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: 'var(--color-border)', strokeWidth: 1.5 },
        }}
      >
        <Background
          color="var(--color-border)"
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="rgba(0, 0, 0, 0.08)"
          className="!right-4 !bottom-16"
          pannable
          zoomable
        />
      </ReactFlow>
      <CanvasToolbar
        onTidyUp={() => handleTidyUp(direction)}
        onAddSticky={addStickyAtCenter}
        onFitView={() => fitView({ padding: 0.15, duration: 300 })}
      />
    </div>
  )
}

// ── Outer wrapper (provides ReactFlowProvider) ─────────────────────────────────

interface CanvasViewProps {
  treeData: VisualTreeNode | null
  crossLinks: CrossLink[]
  parentGoalMap: Map<string, string>
  onConvertToGoal?: (text: string) => void
}

export function CanvasView({
  treeData,
  crossLinks,
  parentGoalMap,
  onConvertToGoal,
}: CanvasViewProps) {
  return (
    <ReactFlowProvider>
      <CanvasViewInner
        treeData={treeData}
        crossLinks={crossLinks}
        parentGoalMap={parentGoalMap}
        onConvertToGoal={onConvertToGoal}
      />
    </ReactFlowProvider>
  )
}
