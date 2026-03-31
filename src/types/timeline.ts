// Timeline types for 나의 흐름 (My Flow)

export type TimelineEventType = 'goal_status' | 'task_status' | 'profile_trait' | 'direction_change'

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
}

export interface TimelineDateGroup {
  date: string
  events: TimelineEvent[]
}
