'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { createClient } from '@/lib/supabase/client'
import { useReviewDirection } from './use-review-direction'

// ============================================
// Types
// ============================================

export type ActivityEventType =
  | 'goal-created'
  | 'goal-completed'
  | 'task-created'
  | 'task-completed'
  | 'task-paused'
  | 'group-completed'

export interface ActivityEvent {
  id: string
  date: string // ISO date
  type: ActivityEventType
  entityName: string
  goalName?: string
  areaId?: string
  areaEmoji?: string
  reason?: string | null
}

// ============================================
// Event type labels & icons
// ============================================

const EVENT_ICONS: Record<ActivityEventType, string> = {
  'goal-created': '🎯',
  'goal-completed': '✅',
  'task-created': '🆕',
  'task-completed': '✅',
  'task-paused': '⏸',
  'group-completed': '🏁',
}

const EVENT_LABELS: Record<ActivityEventType, string> = {
  'goal-created': '목표 시작',
  'goal-completed': '목표 완료',
  'task-created': '추가됨',
  'task-completed': '완료',
  'task-paused': '잠시 멈춤',
  'group-completed': '그룹 완료',
}

export { EVENT_ICONS, EVENT_LABELS }

// ============================================
// Fetch
// ============================================

async function fetchActivityLog(areaId?: string, directionId?: string): Promise<ActivityEvent[]> {
  const supabase = createClient()

  // Build query: areas → goals → groups + tasks
  let query = supabase.from('areas').select(
    `
    id, emoji,
    goals (
      id, name, created_at, completed_at, status_change_reason,
      groups (id, name, completed_at),
      tasks (id, name, created_at, completed_at, paused_at, status_change_reason)
    )
  `
  )

  if (areaId) {
    query = query.eq('id', areaId)
  }

  if (directionId) {
    query = query.eq('direction_id', directionId)
  }

  const { data: areas, error } = await query
  if (error) throw error
  if (!areas) return []

  const events: ActivityEvent[] = []

  for (const area of areas) {
    for (const goal of area.goals ?? []) {
      // Goal created
      if (goal.created_at) {
        events.push({
          id: `goal-created-${goal.id}`,
          date: goal.created_at,
          type: 'goal-created',
          entityName: goal.name,
          areaId: area.id,
          areaEmoji: area.emoji,
        })
      }

      // Goal completed
      if (goal.completed_at) {
        events.push({
          id: `goal-completed-${goal.id}`,
          date: goal.completed_at,
          type: 'goal-completed',
          entityName: goal.name,
          areaId: area.id,
          areaEmoji: area.emoji,
        })
      }

      // Group completed
      for (const group of goal.groups ?? []) {
        if (group.completed_at) {
          events.push({
            id: `group-completed-${group.id}`,
            date: group.completed_at,
            type: 'group-completed',
            entityName: group.name,
            goalName: goal.name,
            areaId: area.id,
            areaEmoji: area.emoji,
          })
        }
      }

      // Task events
      for (const task of goal.tasks ?? []) {
        if (task.created_at) {
          events.push({
            id: `task-created-${task.id}`,
            date: task.created_at,
            type: 'task-created',
            entityName: task.name,
            goalName: goal.name,
            areaId: area.id,
            areaEmoji: area.emoji,
          })
        }

        if (task.completed_at) {
          events.push({
            id: `task-completed-${task.id}`,
            date: task.completed_at,
            type: 'task-completed',
            entityName: task.name,
            goalName: goal.name,
            areaId: area.id,
            areaEmoji: area.emoji,
          })
        }

        if (task.paused_at) {
          events.push({
            id: `task-paused-${task.id}`,
            date: task.paused_at,
            type: 'task-paused',
            entityName: task.name,
            goalName: goal.name,
            areaId: area.id,
            areaEmoji: area.emoji,
            reason: task.status_change_reason,
          })
        }
      }
    }
  }

  // Sort newest first
  events.sort((a, b) => b.date.localeCompare(a.date))

  return events
}

// ============================================
// Hooks
// ============================================

/** Fetch all activity events (dashboard snippet) */
export function useActivityLog() {
  const { directionId } = useReviewDirection()

  return useQuery({
    queryKey: queryKeys.review.activityLog(directionId),
    queryFn: () => fetchActivityLog(undefined, directionId),
    staleTime: STALE_TIMES.STATS,
    enabled: !!directionId,
  })
}

/** Fetch activity events for a specific area (Journey panel) */
export function useAreaActivityLog(areaId: string | undefined) {
  const { directionId } = useReviewDirection()

  return useQuery({
    queryKey: queryKeys.review.areaActivityLog(areaId ?? '', directionId),
    queryFn: () => fetchActivityLog(areaId, directionId),
    staleTime: STALE_TIMES.STATS,
    enabled: !!areaId && !!directionId,
  })
}
