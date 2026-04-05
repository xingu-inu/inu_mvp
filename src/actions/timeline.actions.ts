'use server'

import { authAction } from '@/lib/security'
import {
  statusHistoryRepository,
  directionHistoryRepository,
  profileTraitRepository,
  goalRepository,
  taskRepository,
  areaRepository,
  hiddenTimelineRepository,
} from '@/repositories'
import { getActiveDirectionId } from '@/repositories/base.repository'
import { successResponse } from '@/lib/api'
import type { ApiResponse } from '@/types'
import type { Area, Goal, Task } from '@/types/entities'
import type { TimelineEvent } from '@/types/timeline'
import type {
  GoalStatusHistoryRow,
  TaskStatusHistoryRow,
} from '@/repositories/status-history.repository'
import type { DirectionHistoryRow } from '@/repositories/direction-history.repository'

// ============================================
// Status label maps
// ============================================

const GOAL_STATUS_LABELS: Record<string, string> = {
  active: '활성',
  backlog: '백로그',
  completed: '완료',
  maintenance: '유지',
  paused: '일시정지',
  archived: '보관',
}

const TASK_STATUS_LABELS: Record<string, string> = {
  active: '활성',
  completed: '완료',
  paused: '일시정지',
}

// ============================================
// Mapper functions
// ============================================

function mapGoalHistory(
  row: GoalStatusHistoryRow,
  goalMap: Map<string, Goal>,
  areaMap: Map<string, Area>
): TimelineEvent {
  const goal = goalMap.get(row.goal_id)
  const area = goal ? areaMap.get(goal.area_id) : undefined
  const from = GOAL_STATUS_LABELS[row.from_status] ?? row.from_status
  const to = GOAL_STATUS_LABELS[row.to_status] ?? row.to_status

  return {
    id: `goal-${row.id}`,
    type: 'goal_status',
    timestamp: row.created_at,
    title: `${from} → ${to}`,
    description: row.note ?? row.reason ?? null,
    areaId: goal?.area_id ?? null,
    areaName: area?.name ?? null,
    areaEmoji: area?.emoji ?? null,
    entityId: row.goal_id,
    entityName: goal?.name ?? '(삭제된 목표)',
    fromStatus: row.from_status,
    toStatus: row.to_status,
  }
}

function mapTaskHistory(
  row: TaskStatusHistoryRow,
  taskMap: Map<string, Task>,
  goalMap: Map<string, Goal>,
  areaMap: Map<string, Area>
): TimelineEvent {
  const task = taskMap.get(row.task_id)
  const taskAreaId = task?.area_id ?? (task?.goal_id ? goalMap.get(task.goal_id)?.area_id : null)
  const area = taskAreaId ? areaMap.get(taskAreaId) : undefined
  const from = TASK_STATUS_LABELS[row.from_status] ?? row.from_status
  const to = TASK_STATUS_LABELS[row.to_status] ?? row.to_status

  return {
    id: `task-${row.id}`,
    type: 'task_status',
    timestamp: row.created_at,
    title: `${from} → ${to}`,
    description: row.note ?? row.reason ?? null,
    areaId: taskAreaId ?? null,
    areaName: area?.name ?? null,
    areaEmoji: area?.emoji ?? null,
    entityId: row.task_id,
    entityName: task?.name ?? '(삭제된 태스크)',
    fromStatus: row.from_status,
    toStatus: row.to_status,
  }
}

function mapDirectionHistory(row: DirectionHistoryRow): TimelineEvent {
  const CHANGE_LABELS: Record<string, string> = {
    updated: '방향 수정',
    archived: '방향 보관',
    activated: '방향 활성화',
  }

  return {
    id: `dir-${row.id}`,
    type: 'direction_change',
    timestamp: row.created_at,
    title: CHANGE_LABELS[row.change_type] ?? row.change_type,
    description: row.new_value ?? row.note ?? null,
    areaId: null,
    areaName: null,
    areaEmoji: null,
    entityId: row.direction_id,
    entityName: null,
    fromStatus: row.old_value,
    toStatus: row.new_value,
  }
}

// ============================================
// Server Action
// ============================================

export const getTimelineEvents = authAction(
  'getTimelineEvents',
  async ({ supabase, user }): Promise<ApiResponse<TimelineEvent[]>> => {
    const directionId = await getActiveDirectionId(supabase, user.id)

    // Fetch all data sources in parallel
    const [goalHistory, taskHistory, traits, dirHistory, goals, tasks, areas, hiddenSet] =
      await Promise.all([
        statusHistoryRepository.getAllGoalHistory(supabase, user.id),
        statusHistoryRepository.getAllTaskHistory(supabase, user.id),
        profileTraitRepository.getByUser(supabase, user.id),
        directionHistoryRepository.getAllHistory(supabase, user.id),
        goalRepository.getAll(supabase, user.id, directionId),
        taskRepository.getAll(supabase, user.id),
        areaRepository.getAll(supabase, user.id),
        hiddenTimelineRepository.getByUser(supabase, user.id),
      ])

    // Build lookup maps
    const areaMap = new Map<string, Area>(areas.map((a) => [a.id, a]))
    const goalMap = new Map<string, Goal>(goals.map((g) => [g.id, g]))
    const taskMap = new Map<string, Task>(tasks.map((t) => [t.id, t]))

    // Map all events
    const events: TimelineEvent[] = []

    for (const row of goalHistory) {
      events.push(mapGoalHistory(row, goalMap, areaMap))
    }

    for (const row of taskHistory) {
      events.push(mapTaskHistory(row, taskMap, goalMap, areaMap))
    }

    // Profile trait events (created + each history change + latest update)
    for (const trait of traits) {
      events.push({
        id: `trait-created-${trait.id}`,
        type: 'profile_trait',
        timestamp: trait.created_at,
        title: '프로필 항목 추가',
        description: trait.value,
        areaId: null,
        areaName: null,
        areaEmoji: null,
        entityId: trait.id,
        entityName: trait.label,
        fromStatus: null,
        toStatus: trait.value,
      })

      // Generate events from history entries (each value change)
      const history = trait.history ?? []
      for (let i = 0; i < history.length; i++) {
        const entry = history[i]
        const nextValue = i < history.length - 1 ? history[i + 1].value : trait.value
        events.push({
          id: `trait-history-${trait.id}-${i}`,
          type: 'profile_trait',
          timestamp: entry.changed_at,
          title: '프로필 항목 수정',
          description: null,
          areaId: null,
          areaName: null,
          areaEmoji: null,
          entityId: trait.id,
          entityName: trait.label,
          fromStatus: entry.value,
          toStatus: nextValue,
        })
      }
    }

    for (const row of dirHistory) {
      events.push(mapDirectionHistory(row))
    }

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    // Filter out hidden events
    const visibleEvents = events.filter((e) => !hiddenSet.has(e.id))

    return successResponse(visibleEvents)
  }
)
