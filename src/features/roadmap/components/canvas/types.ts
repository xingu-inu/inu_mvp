import type { Node, Edge } from '@xyflow/react'
import type { GoalStatus } from '@/types/entities'
import type { VisualTreeNode } from '../visual-tree/tree-node-card'

// ── Node data payloads ──────────────────────────────────────

/** Shared interaction state injected into all canvas nodes */
interface InteractionState {
  isSelected?: boolean
  isSearchMatch?: boolean
  searchQuery?: string
}

/** Ancestor why entry for Why Chain tooltip */
export interface AncestorWhy {
  name: string
  why?: string | null
}

export interface DirectionNodeData extends InteractionState {
  treeNode: VisualTreeNode
  [key: string]: unknown
}

export interface AreaNodeData extends InteractionState {
  treeNode: VisualTreeNode
  goalCount: number
  statusCounts?: Partial<Record<GoalStatus, number>>
  ancestorWhys?: AncestorWhy[]
  [key: string]: unknown
}

export interface GoalNodeData extends InteractionState {
  treeNode: VisualTreeNode
  areaColor: string
  parentAreaId?: string
  ancestorWhys?: AncestorWhy[]
  [key: string]: unknown
}

export interface StickyNodeData {
  noteId: string
  text: string
  color: string
  onConvertToGoal?: (text: string) => void
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
