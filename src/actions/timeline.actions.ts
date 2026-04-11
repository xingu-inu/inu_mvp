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
  activityLogRepository,
} from '@/repositories'
import { getActiveDirectionId } from '@/repositories/base.repository'
import { successResponse } from '@/lib/api'
import type { ApiResponse } from '@/types'
import type { Area, Goal, Task } from '@/types/entities'
import type { TimelineEvent, ActivityEntityKind, ActivityKind } from '@/types/timeline'
import type {
  GoalStatusHistoryRow,
  TaskStatusHistoryRow,
} from '@/repositories/status-history.repository'
import type { DirectionHistoryRow } from '@/repositories/direction-history.repository'
import type { ActivityLogRow } from '@/repositories/activity-log.repository'

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

// ============================================
// Activity Log mapping
// ============================================

const ENTITY_LABELS: Record<ActivityEntityKind, string> = {
  area: '영역',
  goal: '목표',
  group: '그룹',
  task: '할일',
}

const ACTION_LABELS: Record<ActivityKind, string> = {
  created: '추가',
  renamed: '이름 변경',
  why_updated: 'Why 수정',
  moved: '이동',
  deleted: '삭제',
}

function describeActivity(
  row: ActivityLogRow,
  areaMap: Map<string, Area>,
  goalMap: Map<string, Goal>
): string | null {
  const meta = row.metadata ?? {}

  if (row.action === 'renamed') {
    const from = (meta as { from?: unknown }).from
    const to = (meta as { to?: unknown }).to
    // Area의 경우 { name, emoji } 오브젝트, Goal/Group/Task는 문자열
    const fromStr =
      typeof from === 'string'
        ? from
        : from && typeof from === 'object' && 'name' in from
          ? String((from as { name: unknown }).name ?? '')
          : null
    const toStr =
      typeof to === 'string'
        ? to
        : to && typeof to === 'object' && 'name' in to
          ? String((to as { name: unknown }).name ?? '')
          : null
    if (fromStr && toStr) return `${fromStr} → ${toStr}`
  }

  if (row.action === 'why_updated') {
    const to = (meta as { to?: unknown }).to
    return typeof to === 'string' && to.length > 0 ? to : null
  }

  if (row.action === 'moved') {
    // metadata: { from: { [parentColumn]: id, group_id?: id }, to: { ... } }
    // Goal → area_id 축, Group/Task → goal_id 축
    const from = (meta as { from?: Record<string, unknown> }).from ?? {}
    const to = (meta as { to?: Record<string, unknown> }).to ?? {}

    // parent 축 결정: goal entity면 area, 나머지(group/task)면 goal
    const parentKey = row.entity_type === 'goal' ? 'area_id' : 'goal_id'
    const fromId = from[parentKey]
    const toId = to[parentKey]

    const lookup = row.entity_type === 'goal' ? areaMap : goalMap
    const resolveName = (id: unknown): string | null => {
      if (typeof id !== 'string') return null
      const entity = lookup.get(id) as { name?: string } | undefined
      return entity?.name ?? null
    }

    const fromName = resolveName(fromId)
    const toName = resolveName(toId)

    // 표시 가능한 이름이 하나라도 있으면 렌더. 삭제된 부모는 "(삭제됨)" 으로 폴백
    if (fromId || toId) {
      const fromLabel = fromName ?? (fromId ? '(삭제됨)' : '없음')
      const toLabel = toName ?? (toId ? '(삭제됨)' : '없음')
      return `${fromLabel} → ${toLabel}`
    }
  }

  return null
}

function mapActivityLog(
  row: ActivityLogRow,
  areaMap: Map<string, Area>,
  goalMap: Map<string, Goal>,
  taskMap: Map<string, Task>
): TimelineEvent {
  const entityType = row.entity_type
  const action = row.action

  // entityName: 살아 있으면 현재 이름, 아니면 스냅샷 fallback
  let entityName: string | null = row.entity_name ?? null
  if (entityType === 'area') {
    entityName = areaMap.get(row.entity_id)?.name ?? entityName
  } else if (entityType === 'goal') {
    entityName = goalMap.get(row.entity_id)?.name ?? entityName
  } else if (entityType === 'task') {
    entityName = taskMap.get(row.entity_id)?.name ?? entityName
  }

  // areaId/Name/Emoji 복원 — entity가 area면 자기 자신, goal/task면 부모 area
  let resolvedAreaId: string | null = null
  if (entityType === 'area') {
    resolvedAreaId = row.entity_id
  } else if (entityType === 'goal') {
    resolvedAreaId = goalMap.get(row.entity_id)?.area_id ?? row.area_id ?? null
  } else if (entityType === 'task') {
    const task = taskMap.get(row.entity_id)
    resolvedAreaId =
      task?.area_id ??
      (task?.goal_id ? goalMap.get(task.goal_id)?.area_id : null) ??
      row.area_id ??
      null
  } else if (entityType === 'group' && row.goal_id) {
    resolvedAreaId = goalMap.get(row.goal_id)?.area_id ?? row.area_id ?? null
  }

  const area = resolvedAreaId ? areaMap.get(resolvedAreaId) : undefined

  return {
    id: `activity-${row.id}`,
    type: 'entity_activity',
    timestamp: row.created_at,
    title: `${ENTITY_LABELS[entityType]} ${ACTION_LABELS[action]}`,
    description: describeActivity(row, areaMap, goalMap),
    areaId: resolvedAreaId,
    areaName: area?.name ?? null,
    areaEmoji: area?.emoji ?? null,
    entityId: row.entity_id,
    entityName,
    fromStatus: null,
    toStatus: null,
    activity: { entityType, action },
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
    const [
      goalHistory,
      taskHistory,
      traits,
      dirHistory,
      activityRows,
      goals,
      tasks,
      areas,
      hiddenSet,
    ] = await Promise.all([
      statusHistoryRepository.getAllGoalHistory(supabase, user.id),
      statusHistoryRepository.getAllTaskHistory(supabase, user.id),
      profileTraitRepository.getAllIncludingDeleted(supabase, user.id),
      directionHistoryRepository.getAllHistory(supabase, user.id),
      activityLogRepository.getAll(supabase, user.id),
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

      // Deleted event (soft delete)
      if (trait.deleted_at) {
        events.push({
          id: `trait-deleted-${trait.id}`,
          type: 'profile_trait',
          timestamp: trait.deleted_at,
          title: '프로필 항목 삭제',
          description: trait.value,
          areaId: null,
          areaName: null,
          areaEmoji: null,
          entityId: trait.id,
          entityName: trait.label,
          fromStatus: trait.value,
          toStatus: null,
        })
      }
    }

    for (const row of dirHistory) {
      events.push(mapDirectionHistory(row))
    }

    for (const row of activityRows) {
      events.push(mapActivityLog(row, areaMap, goalMap, taskMap))
    }

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    // Filter out hidden events
    const visibleEvents = events.filter((e) => !hiddenSet.has(e.id))

    return successResponse(visibleEvents)
  }
)
