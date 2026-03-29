import type { Node, Edge } from '@xyflow/react'
import type { GoalStatus } from '@/types/entities'
import type { VisualTreeNode } from '../visual-tree/tree-node-card'

// ── Semantic zoom ────────────────────────────────────────────

/** Quantized zoom bands injected as zoomLevel (0 = compact, 1 = medium, 2 = full) */
export const ZOOM_COMPACT = 0
export const ZOOM_MEDIUM = 1
export const ZOOM_FULL = 2

// ── Node data payloads ──────────────────────────────────────

/** Shared interaction state injected into all canvas nodes */
interface InteractionState {
  isSelected?: boolean
  isSearchMatch?: boolean
  searchQuery?: string
  /** Quantized zoom band: 0 = compact, 1 = medium, 2 = full */
  zoomLevel?: number
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
  isExpanded?: boolean
  [key: string]: unknown
}

export interface GroupNodeData extends InteractionState {
  treeNode: VisualTreeNode
  areaColor: string
  parentGoalId: string
  ancestorWhys?: AncestorWhy[]
  [key: string]: unknown
}

export interface TaskNodeData extends InteractionState {
  treeNode: VisualTreeNode
  areaColor: string
  parentGoalId: string
  parentGroupId?: string
  ancestorWhys?: AncestorWhy[]
  [key: string]: unknown
}

// ── Edge data payloads ──────────────────────────────────────

export interface HierarchyEdgeData {
  edgeType: 'hierarchy'
  /** 0=dir→area, 1=area→goal, 2=goal→group/task, 3=group→task */
  depth?: number
  [key: string]: unknown
}

export interface SharedTaskEdgeData {
  edgeType: 'shared-task'
  strength: number
  areaColor: string
  [key: string]: unknown
}

export type DependencyRelation = 'depends-on' | 'supports' | 'conflicts'

export interface DependencyEdgeData {
  edgeType: 'dependency'
  relation: DependencyRelation
  [key: string]: unknown
}

// ── Typed aliases ───────────────────────────────────────────

export type WhyMapNode =
  | Node<DirectionNodeData, 'direction'>
  | Node<AreaNodeData, 'area'>
  | Node<GoalNodeData, 'goal'>
  | Node<GroupNodeData, 'group'>
  | Node<TaskNodeData, 'task'>

export type WhyMapEdge = Edge<HierarchyEdgeData | SharedTaskEdgeData | DependencyEdgeData>
