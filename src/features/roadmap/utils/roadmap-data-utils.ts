import { GOAL_STATUS_GROUPS } from '@/lib/goal-status'
import type { Direction, Area, Goal } from '@/types/entities'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type TreeNodeType = 'direction' | 'status-group' | 'area' | 'goal' | 'group' | 'task'

export interface TreeNode {
  type: TreeNodeType
  id: string
  name: string
  why?: string | null
  emoji?: string
  color?: string
  status?: string
  children?: TreeNode[]
  meta?: {
    count?: number
    streak?: number
    isActive?: boolean
    isCompleted?: boolean
    isDone?: boolean
    targetDate?: string | null
  }
}

export interface CrossLink {
  sourceTaskId?: string // for task-level cross-links
  sourceGoalId?: string // for goal-level cross-links
  targetGoalId?: string // for task-level cross-links
  targetNodeId: string
  areaColor: string
}

export interface BuildTreeResult {
  tree: TreeNode
  crossLinks: CrossLink[]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tree Data Builder
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buildTreeData(
  direction: Direction | null,
  areas: Area[],
  goals: Goal[]
): BuildTreeResult {
  const today = new Date().toISOString().split('T')[0]
  const crossLinks: CrossLink[] = []

  // Build area color lookup for cross-link rendering
  const areaColorMap = new Map<string, string>()
  for (const area of areas) {
    areaColorMap.set(area.id, area.color)
  }

  // Group goals by status, then by area
  const statusGroupNodes = GOAL_STATUS_GROUPS.map((statusGroup) => {
    const statusGoals = goals.filter((g) => g.status === statusGroup.id)
    if (statusGoals.length === 0) return null

    // Group by area within this status
    const areaMap = new Map<string, Goal[]>()
    statusGoals.forEach((goal) => {
      const existing = areaMap.get(goal.area_id) || []
      areaMap.set(goal.area_id, [...existing, goal])
    })

    // Build area nodes
    const areaNodes = Array.from(areaMap.entries())
      .map(([areaId, areaGoals]) => {
        const area = areas.find((a) => a.id === areaId)
        if (!area) return null

        // Build goal nodes
        const goalNodes: TreeNode[] = areaGoals.map((goal) => {
          const groups = goal.groups || []
          const tasks = goal.tasks || []

          // Build group nodes
          const groupNodes: TreeNode[] = groups.map((group) => {
            const groupTasks = tasks.filter((t) => t.group_id === group.id)

            // Build task nodes
            const taskNodes: TreeNode[] = groupTasks.map((task) => {
              // Collect cross-links
              if (task.related_goal_ids?.length) {
                for (const relatedGoalId of task.related_goal_ids) {
                  const targetGroupId = task.cross_link_group_map?.[relatedGoalId]
                  crossLinks.push({
                    sourceTaskId: task.id,
                    targetGoalId: relatedGoalId,
                    targetNodeId: targetGroupId ?? relatedGoalId,
                    areaColor: areaColorMap.get(goal.area_id) ?? '#8a8078',
                  })
                }
              }
              return {
                type: 'task' as const,
                id: task.id,
                name: task.name,
                why: task.why,
                meta: {
                  streak: task.streak_count,
                  isDone: task.check_ins?.some((c) => c.date === today && c.status === 'done'),
                },
              }
            })

            return {
              type: 'group' as const,
              id: group.id,
              name: group.name,
              meta: {
                isCompleted: group.is_completed,
              },
              children: taskNodes.length > 0 ? taskNodes : undefined,
            }
          })

          // Tasks without group (directly under goal)
          const directTasks = tasks.filter((t) => !t.group_id)
          const directTaskNodes: TreeNode[] = directTasks.map((task) => {
            // Collect cross-links
            if (task.related_goal_ids?.length) {
              for (const relatedGoalId of task.related_goal_ids) {
                const targetGroupId = task.cross_link_group_map?.[relatedGoalId]
                crossLinks.push({
                  sourceTaskId: task.id,
                  targetGoalId: relatedGoalId,
                  targetNodeId: targetGroupId ?? relatedGoalId,
                  areaColor: areaColorMap.get(goal.area_id) ?? '#8a8078',
                })
              }
            }
            return {
              type: 'task' as const,
              id: task.id,
              name: task.name,
              why: task.why,
              meta: {
                streak: task.streak_count,
                isDone: task.check_ins?.some((c) => c.date === today && c.status === 'done'),
              },
            }
          })

          const allChildren = [...groupNodes, ...directTaskNodes]

          // Collect goal-level cross-links for impact areas
          if (goal.impact_area_ids?.length) {
            for (const impactAreaId of goal.impact_area_ids) {
              crossLinks.push({
                sourceGoalId: goal.id,
                targetNodeId: impactAreaId,
                areaColor: areaColorMap.get(impactAreaId) ?? '#8a8078',
              })
            }
          }

          return {
            type: 'goal' as const,
            id: goal.id,
            name: goal.name,
            why: goal.why,
            status: goal.status,
            meta: { targetDate: goal.target_date },
            children: allChildren.length > 0 ? allChildren : undefined,
          }
        })

        return {
          type: 'area' as const,
          id: area.id,
          name: area.name,
          emoji: area.emoji,
          color: area.color,
          why: area.why,
          meta: { count: areaGoals.length },
          children: goalNodes,
        }
      })
      .filter((n) => n !== null)

    return {
      type: 'status-group' as const,
      id: statusGroup.id,
      name: statusGroup.label,
      meta: { count: statusGoals.length },
      children: areaNodes,
    }
  }).filter((n) => n !== null)

  // Root: Direction
  const tree: TreeNode = {
    type: 'direction',
    id: direction?.id || 'direction-root',
    name: direction?.statement || '나의 방향을 설정해주세요',
    why: direction?.why,
    children: statusGroupNodes.length > 0 ? statusGroupNodes : undefined,
  }

  return { tree, crossLinks }
}
