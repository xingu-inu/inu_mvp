import type { Node, Edge } from '@xyflow/react'
import type { VisualTreeNode } from '../visual-tree/tree-node-card'

// ── Node data payloads ──────────────────────────────────────

export interface DirectionNodeData {
  treeNode: VisualTreeNode
  [key: string]: unknown
}

export interface AreaNodeData {
  treeNode: VisualTreeNode
  goalCount: number
  [key: string]: unknown
}

export interface GoalNodeData {
  treeNode: VisualTreeNode
  areaColor: string
  [key: string]: unknown
}

export interface StickyNodeData {
  noteId: string
  text: string
  color: string
  [key: string]: unknown
}

// ── Edge data payloads ──────────────────────────────────────

export interface HierarchyEdgeData {
  edgeType: 'hierarchy'
  [key: string]: unknown
}

export interface SharedTaskEdgeData {
  edgeType: 'shared-task'
  strength: number
  areaColor: string
  [key: string]: unknown
}

// ── Typed aliases ───────────────────────────────────────────

export type WhyMapNode =
  | Node<DirectionNodeData, 'direction'>
  | Node<AreaNodeData, 'area'>
  | Node<GoalNodeData, 'goal'>
  | Node<StickyNodeData, 'sticky'>

export type WhyMapEdge = Edge<HierarchyEdgeData | SharedTaskEdgeData>
