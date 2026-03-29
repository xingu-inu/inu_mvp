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
  /** AI Balance overlay: warning message */
  balanceWarning?: string
  /** AI Balance overlay: severity level */
  balanceLevel?: 'warning' | 'critical'
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

// ── Why Walk (presentation mode) ────────────────────────────

export interface WhyWalkStep {
  nodeId: string
  type: 'direction' | 'area' | 'goal'
  name: string
  emoji?: string | null
  why?: string | null
  stats?: { totalStreak?: number; completionRate?: number; activeCount?: number }
}

export interface WhyWalkState {
  isActive: boolean
  currentIndex: number
  sequence: WhyWalkStep[]
}

// ── Brainstorm mode ─────────────────────────────────────────

export interface NearbyAreaSuggestion {
  stickyNodeId: string
  areaId: string
  areaName: string
  stickyText: string
  stickyPosition: { x: number; y: number }
}

// ── AI Balance overlay ──────────────────────────────────────

export interface BalanceOverlay {
  nodeId: string
  level: 'warning' | 'critical'
  message: string
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
  | Node<StickyNodeData, 'sticky'>

export type WhyMapEdge = Edge<HierarchyEdgeData | SharedTaskEdgeData | DependencyEdgeData>
