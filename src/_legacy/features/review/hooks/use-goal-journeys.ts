'use client'

import { useQueries } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { createClient } from '@/lib/supabase/client'
import type { GoalStatus } from '@/types/entities'
import type { JourneyEvent } from './use-goal-journey'

// ============================================
// Status labels (Korean) — duplicated to avoid
// circular import with use-goal-journey.ts
// ============================================

const STATUS_LABELS: Record<GoalStatus, string> = {
  active: '진행중',
  backlog: '백로그',
  completed: '완료',
  maintenance: '유지',
  paused: '일시정지',
  archived: '아카이브',
}

// ============================================
// Local row types (goal_status_history not yet in generated db types)
// TODO: Remove after npm run db:types
// ============================================

interface StatusHistoryRow {
  id: string
  goal_id: string
  from_status: GoalStatus
  to_status: GoalStatus
  reason: string | null
  note: string | null
  created_at: string
}

// ============================================
// Fetch (same logic as use-goal-journey.ts)
// ============================================

async function fetchGoalJourney(goalId: string): Promise<JourneyEvent[]> {
  const supabase = createClient()

  // TODO: Remove (supabase as any) after npm run db:types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: statusHistory } = await (supabase as any)
    .from('goal_status_history')
    .select('id, goal_id, from_status, to_status, reason, note, created_at')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: true })
  const typedStatusHistory = (statusHistory ?? []) as StatusHistoryRow[]

  const { data: goal } = await supabase
    .from('goals')
    .select('id, name, created_at, completed_at')
    .eq('id', goalId)
    .single()

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, completed_at')
    .eq('goal_id', goalId)
    .not('completed_at', 'is', null)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, name, created_at')
    .eq('goal_id', goalId)

  const events: JourneyEvent[] = []

  if (goal?.created_at) {
    events.push({
      id: `goal-created-${goal.id}`,
      date: goal.created_at,
      type: 'goal-created',
      title: '목표 시작',
      description: goal.name,
    })
  }

  for (const entry of typedStatusHistory) {
    const fromLabel = STATUS_LABELS[entry.from_status] ?? entry.from_status
    const toLabel = STATUS_LABELS[entry.to_status] ?? entry.to_status
    events.push({
      id: `status-change-${entry.id}`,
      date: entry.created_at,
      type: 'status-change',
      title: `${fromLabel} → ${toLabel}`,
      reason: entry.reason ?? null,
      note: entry.note ?? null,
      fromStatus: entry.from_status,
      toStatus: entry.to_status,
    })
  }

  for (const group of groups ?? []) {
    if (group.completed_at) {
      events.push({
        id: `group-completed-${group.id}`,
        date: group.completed_at,
        type: 'group-completed',
        title: `그룹 완료: ${group.name}`,
      })
    }
  }

  for (const task of tasks ?? []) {
    if (task.created_at) {
      events.push({
        id: `task-added-${task.id}`,
        date: task.created_at,
        type: 'task-added',
        title: `Task 추가: ${task.name}`,
      })
    }
  }

  if (goal?.completed_at) {
    events.push({
      id: `goal-completed-${goal.id}`,
      date: goal.completed_at,
      type: 'goal-completed',
      title: '목표 달성 🎉',
      description: goal.name,
    })
  }

  events.sort((a, b) => a.date.localeCompare(b.date))

  return events
}

// ============================================
// Hook — fetches all goal journeys in parallel
// ============================================

export function useGoalJourneys(goalIds: string[]): Map<string, JourneyEvent[] | undefined> {
  const results = useQueries({
    queries: goalIds.map((goalId) => ({
      queryKey: queryKeys.review.goalJourney(goalId),
      queryFn: () => fetchGoalJourney(goalId),
      staleTime: STALE_TIMES.REVIEW_ACTIVITY,
      enabled: !!goalId,
    })),
  })

  const map = new Map<string, JourneyEvent[] | undefined>()
  goalIds.forEach((goalId, index) => {
    map.set(goalId, results[index]?.data)
  })
  return map
}
