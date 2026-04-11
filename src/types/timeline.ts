// Timeline types for 나의 흐름 (My Flow)

export type TimelineEventType =
  | 'goal_status'
  | 'task_status'
  | 'profile_trait'
  | 'direction_change'
  | 'entity_activity'

export type ActivityEntityKind = 'area' | 'goal' | 'group' | 'task'
export type ActivityKind = 'created' | 'renamed' | 'why_updated' | 'moved' | 'deleted'

export interface TimelineEvent {
  id: string
  type: TimelineEventType
  timestamp: string
  title: string
  description: string | null
  areaId: string | null
  areaName: string | null
  areaEmoji: string | null
  entityId: string
  entityName: string | null
  fromStatus: string | null
  toStatus: string | null
  /**
   * Present only when type === 'entity_activity'.
   * Shape lets the UI decide how to render CRUD events (rename, move, delete, ...).
   */
  activity?: {
    entityType: ActivityEntityKind
    action: ActivityKind
  }
}

export interface TimelineDateGroup {
  date: string
  events: TimelineEvent[]
}

// ============================================
// AI Ambient Timeline Nodes
// ============================================

export type TimelineAiNodeType = 'observation' | 'question'

export interface TimelineAiNode {
  id: string
  nodeType: TimelineAiNodeType
  message: string
  afterDate: string
  relatedAreaIds: string[]
  relatedEventIds: string[]
  chatContext?: {
    type: 'goal' | 'task'
    entityId: string
    entityName: string
    goalId: string
  }
  userResponse?: string | null
  respondedAt?: string | null
}

export type TimelineItem =
  | { kind: 'date-group'; data: TimelineDateGroup }
  | { kind: 'ai-node'; data: TimelineAiNode }
