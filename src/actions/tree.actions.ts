'use server'

import { authAction } from '@/lib/security'

export type NodeType = 'direction' | 'area' | 'goal' | 'group' | 'task'

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
  async ({ supabase }, input: MoveNodeInput): Promise<MoveNodeResult> => {
    const tableName = getTableName(input.nodeType)
    const parentColumn = getParentColumn(input.nodeType)

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

    return { success: true }
  }
)

type TableName = 'directions' | 'areas' | 'goals' | 'groups' | 'tasks'

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
