'use server'

import { authAction } from '@/lib/security'
import { activityLogRepository } from '@/repositories'
import type { TypedSupabaseClient } from '@/repositories/base.repository'

export type NodeType = 'direction' | 'area' | 'goal' | 'group' | 'task'

type TableName = 'directions' | 'areas' | 'goals' | 'groups' | 'tasks'

export interface MoveNodeInput {
  nodeId: string
  nodeType: NodeType
  newOrder: string
  newParentId?: string | null
  targetGroupId?: string | null
}

export interface MoveNodeResult {
  success: boolean
  error?: string
}

/**
 * Move a node to a new position (update sort_order)
 * Optionally change parent (e.g., move goal to different area)
 */
export const moveNode = authAction(
  'moveNode',
  async ({ supabase, user }, input: MoveNodeInput): Promise<MoveNodeResult> => {
    const tableName = getTableName(input.nodeType)
    const parentColumn = getParentColumn(input.nodeType)
    const wantsParentChange = input.newParentId !== undefined && parentColumn !== null

    // 부모가 실제로 바뀌는지 판별하려면 before 스냅샷이 필요하다.
    // sort_order만 바뀌는 경우는 로깅하지 않으므로 before를 조회하지 않음 (user 결정).
    const before = wantsParentChange
      ? await fetchNodeSnapshot(supabase, tableName, input.nodeId, input.nodeType)
      : null

    // Build update data
    const updateData: Record<string, unknown> = {
      sort_order: input.newOrder,
    }

    // Add parent change if explicitly provided (including null for "move to daily")
    if (input.newParentId !== undefined && parentColumn) {
      updateData[parentColumn] = input.newParentId
    }

    // When moving task to a different parent, set group_id (default: clear)
    if (input.nodeType === 'task' && input.newParentId !== undefined) {
      updateData['group_id'] = input.targetGroupId ?? null
    }

    const { error } = await supabase.from(tableName).update(updateData).eq('id', input.nodeId)

    if (error) {
      return { success: false, error: '이동에 실패했습니다.' }
    }

    // 부모가 실제로 바뀐 경우에만 활동 로그 기록 (sort_order만 바뀐 경우 skip)
    if (before && parentColumn) {
      const oldParentId = (before as Record<string, unknown>)[parentColumn] as string | null
      const oldGroupId =
        input.nodeType === 'task'
          ? ((before as Record<string, unknown>)['group_id'] as string | null)
          : null
      const newGroupId = input.nodeType === 'task' ? (input.targetGroupId ?? null) : null

      const parentChanged = (oldParentId ?? null) !== (input.newParentId ?? null)
      const groupChanged =
        input.nodeType === 'task' && (oldGroupId ?? null) !== (newGroupId ?? null)

      if (parentChanged || groupChanged) {
        await activityLogRepository.log(supabase, user.id, {
          entityType: input.nodeType as 'area' | 'goal' | 'group' | 'task',
          entityId: input.nodeId,
          action: 'moved',
          entityName: ((before as Record<string, unknown>)['name'] as string | null) ?? null,
          areaId: deriveAreaId(input.nodeType, before, input.newParentId ?? null),
          goalId: deriveGoalId(input.nodeType, before, input.newParentId ?? null),
          metadata: {
            from: {
              [parentColumn]: oldParentId,
              ...(input.nodeType === 'task' ? { group_id: oldGroupId } : {}),
            },
            to: {
              [parentColumn]: input.newParentId ?? null,
              ...(input.nodeType === 'task' ? { group_id: newGroupId } : {}),
            },
          },
        })
      }
    }

    return { success: true }
  }
)

async function fetchNodeSnapshot(
  supabase: TypedSupabaseClient,
  tableName: TableName,
  nodeId: string,
  nodeType: NodeType
): Promise<Record<string, unknown> | null> {
  // Select only the columns we need for logging: name + parent pointers
  const cols =
    nodeType === 'task'
      ? 'name, goal_id, group_id, area_id'
      : nodeType === 'group'
        ? 'name, goal_id'
        : nodeType === 'goal'
          ? 'name, area_id'
          : 'name'
  const { data } = await supabase.from(tableName).select(cols).eq('id', nodeId).single()
  return (data as Record<string, unknown> | null) ?? null
}

function deriveAreaId(
  nodeType: NodeType,
  before: Record<string, unknown> | null,
  newParentId: string | null
): string | null {
  if (!before) return null
  if (nodeType === 'area') return (before['id'] as string | null) ?? null
  if (nodeType === 'goal') return newParentId ?? (before['area_id'] as string | null) ?? null
  if (nodeType === 'task') return (before['area_id'] as string | null) ?? null
  return null
}

function deriveGoalId(
  nodeType: NodeType,
  before: Record<string, unknown> | null,
  newParentId: string | null
): string | null {
  if (!before) return null
  if (nodeType === 'task') return newParentId ?? (before['goal_id'] as string | null) ?? null
  if (nodeType === 'group') return newParentId ?? (before['goal_id'] as string | null) ?? null
  return null
}

function getTableName(nodeType: NodeType): TableName {
  const map: Record<NodeType, TableName> = {
    direction: 'directions',
    area: 'areas',
    goal: 'goals',
    group: 'groups',
    task: 'tasks',
  }
  return map[nodeType]
}

function getParentColumn(nodeType: NodeType): string | null {
  const map: Record<NodeType, string | null> = {
    direction: null,
    area: null,
    goal: 'area_id',
    group: 'goal_id',
    task: 'goal_id',
  }
  return map[nodeType]
}
