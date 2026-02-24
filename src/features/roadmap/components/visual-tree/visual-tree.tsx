'use client'

import { useMemo, useCallback, useRef, useState, memo } from 'react'
import {
  useRoadmapStore,
  selectSelectedNodeId,
  type SelectedNodeType,
  type Selection,
} from '@/stores/roadmap.store'
import { TreeNode } from './tree-node'
import { TreeQuickAdd } from './tree-quick-add'
import { CrossLinkOverlay, type CrossLink } from '../cross-link-overlay'
import type { VisualTreeNode } from './tree-node-card'
import type { Area, Goal } from '@/types/entities'
import type { AreaType } from '@/types/entities'
import type { TreeLayoutDirection } from '@/stores/roadmap.store'
import { useFocusBranch } from '../../hooks/use-focus-branch'
import { useDeleteArea } from '@/queries/use-areas'
import { useDeleteGoal } from '@/queries/use-goals'
import { useDeleteGroup } from '@/queries/use-groups'
import { useDeleteTask } from '@/queries/use-tasks'

interface VisualTreeProps {
  treeData: VisualTreeNode | null
  crossLinks: CrossLink[]
  goals: Goal[]
  areas: Area[]
  layoutDirection: TreeLayoutDirection
  searchQuery: string
  searchMatchedIds: Set<string>
}

export const VisualTree = memo(function VisualTree({
  treeData,
  crossLinks,
  goals,
  areas,
  layoutDirection,
  searchQuery,
  searchMatchedIds,
}: VisualTreeProps) {
  const selectedNodeId = useRoadmapStore(selectSelectedNodeId)
  const select = useRoadmapStore((s) => s.select)
  const focusGoal = useRoadmapStore((s) => s.focusGoal)
  const containerRef = useRef<HTMLDivElement>(null)

  // Quick Add state — which node's popover is open
  const [addingToId, setAddingToId] = useState<string | null>(null)

  // Focus mode: highlight selected node's branch
  const focusedIds = useFocusBranch(treeData, selectedNodeId)

  // Delete mutations
  const deleteArea = useDeleteArea()
  const deleteGoal = useDeleteGoal()
  const deleteGroup = useDeleteGroup()
  const deleteTask = useDeleteTask()

  // Map group/task IDs to their parent goal IDs for inline editing
  const parentGoalMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const goal of goals) {
      for (const group of goal.groups || []) {
        map.set(group.id, goal.id)
        for (const task of (goal.tasks || []).filter((t) => t.group_id === group.id)) {
          map.set(task.id, goal.id)
        }
      }
      for (const task of (goal.tasks || []).filter((t) => !t.group_id)) {
        map.set(task.id, goal.id)
      }
    }
    return map
  }, [goals])

  // Map area ID → area type for sample suggestions
  const areaTypeMap = useMemo(() => {
    const map = new Map<string, AreaType>()
    for (const area of areas) {
      map.set(area.id, area.type as AreaType)
    }
    return map
  }, [areas])

  // Map goal ID → area ID for context lookup
  const goalAreaMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const goal of goals) {
      map.set(goal.id, goal.area_id)
    }
    return map
  }, [goals])

  const handleStartAdd = useCallback((_type: SelectedNodeType, id: string) => {
    setAddingToId(id)
  }, [])

  const handleCancelAdd = useCallback(() => {
    setAddingToId(null)
  }, [])

  const getQuickAddContent = useCallback(
    (node: VisualTreeNode) => {
      const parentType = node.type as 'direction' | 'area' | 'goal' | 'group'
      let goalId: string | undefined
      let areaType: AreaType | undefined

      if (parentType === 'area') {
        areaType = areaTypeMap.get(node.id)
      } else if (parentType === 'goal') {
        const areaId = goalAreaMap.get(node.id)
        if (areaId) areaType = areaTypeMap.get(areaId)
      } else if (parentType === 'group') {
        goalId = parentGoalMap.get(node.id)
        if (goalId) {
          const areaId = goalAreaMap.get(goalId)
          if (areaId) areaType = areaTypeMap.get(areaId)
        }
      }

      return (
        <TreeQuickAdd
          parentType={parentType}
          parentId={node.id}
          goalId={goalId}
          areaType={areaType}
          onClose={handleCancelAdd}
        />
      )
    },
    [areaTypeMap, goalAreaMap, parentGoalMap, handleCancelAdd]
  )

  const handleNodeSelect = useCallback(
    (type: SelectedNodeType, id: string) => {
      if (type === 'goal') {
        focusGoal(id)
      } else if (type === 'group') {
        const goalId = parentGoalMap.get(id)
        if (goalId) {
          // Single atomic update — no intermediate render, no rAF race
          useRoadmapStore.setState({
            selection: { type: 'group', id, goalId } as Selection,
            focusedGoalId: goalId,
            inlineMode: { type: 'edit-group', groupId: id },
          })
        }
      } else if (type === 'task') {
        const goalId = parentGoalMap.get(id)
        if (goalId) {
          // Single atomic update — no intermediate render, no rAF race
          useRoadmapStore.setState({
            selection: { type: 'task', id, goalId } as Selection,
            focusedGoalId: goalId,
            inlineMode: { type: 'edit-task', taskId: id },
          })
        }
      } else {
        // Direction, Area
        select({ type: type as 'direction' | 'area', id })
      }
    },
    [focusGoal, select, parentGoalMap]
  )

  // Unified delete handler for context menu
  const handleDeleteNode = useCallback(
    (type: SelectedNodeType, id: string) => {
      switch (type) {
        case 'area':
          deleteArea.mutate(id)
          break
        case 'goal':
          deleteGoal.mutate(id)
          break
        case 'group': {
          const goalId = parentGoalMap.get(id)
          if (goalId) deleteGroup.mutate({ id, goalId })
          break
        }
        case 'task':
          deleteTask.mutate(id)
          break
      }
    },
    [deleteArea, deleteGoal, deleteGroup, deleteTask, parentGoalMap]
  )

  if (!treeData) return null

  return (
    <div className="relative p-10" ref={containerRef}>
      <div className="w-fit min-w-max">
        <TreeNode
          node={treeData}
          selectedNodeId={selectedNodeId}
          onNodeSelect={handleNodeSelect}
          isFormMode={false}
          layoutDirection={layoutDirection}
          addingToId={addingToId}
          onStartAdd={handleStartAdd}
          onCancelAdd={handleCancelAdd}
          getQuickAddContent={getQuickAddContent}
          focusedIds={focusedIds}
          searchMatchedIds={searchMatchedIds}
          searchQuery={searchQuery}
          onDeleteNode={handleDeleteNode}
          parentGoalMap={parentGoalMap}
        />
      </div>
      {crossLinks.length > 0 && (
        <CrossLinkOverlay
          containerRef={containerRef}
          crossLinks={crossLinks}
          layoutDirection={layoutDirection}
        />
      )}
    </div>
  )
})

/**
 * Build tree data without status-group layer:
 * Direction → Area → Goal → Group → Task
 */
export function buildVisualTreeData(
  direction: { id: string; statement: string | null; why: string | null } | null,
  areas: Area[],
  goals: Goal[],
  statusFilter: string
): { tree: VisualTreeNode | null; crossLinks: CrossLink[] } {
  const today = new Date().toISOString().split('T')[0]
  const crossLinks: CrossLink[] = []

  // Apply status filter
  const filteredGoals =
    statusFilter === 'all' ? goals : goals.filter((g) => g.status === statusFilter)

  // Group goals by area
  const goalsByArea = new Map<string, Goal[]>()
  filteredGoals.forEach((goal) => {
    const existing = goalsByArea.get(goal.area_id) || []
    goalsByArea.set(goal.area_id, [...existing, goal])
  })

  // Build area nodes (only areas that have goals after filtering)
  const areaNodes: VisualTreeNode[] = areas
    .filter((area) => goalsByArea.has(area.id))
    .map((area) => {
      const areaGoals = goalsByArea.get(area.id) || []

      // Build goal nodes
      const goalNodes: VisualTreeNode[] = areaGoals.map((goal) => {
        const groups = goal.groups || []
        const tasks = goal.tasks || []

        // Build group nodes
        const groupNodes: VisualTreeNode[] = groups.map((group) => {
          const groupTasks = tasks.filter((t) => t.group_id === group.id)

          const taskNodes: VisualTreeNode[] = groupTasks.map((task) => {
            // Collect cross-links
            if (task.related_goal_ids?.length) {
              for (const relatedGoalId of task.related_goal_ids) {
                const targetGroupId = task.cross_link_group_map?.[relatedGoalId]
                crossLinks.push({
                  sourceTaskId: task.id,
                  targetGoalId: relatedGoalId,
                  targetNodeId: targetGroupId ?? relatedGoalId,
                  areaColor: area.color ?? '#8a8078',
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
                isPaused: task.status === 'paused',
                isCompletedTask: task.status === 'completed',
                repeatType: task.repeat_type,
                hasCrossLinks: (task.related_goal_ids?.length ?? 0) > 0,
                sortOrder: task.sort_order,
              },
            }
          })

          return {
            type: 'group' as const,
            id: group.id,
            name: group.name,
            why: group.why,
            meta: {
              count: groupTasks.length || undefined,
              isCompleted: group.is_completed,
              sortOrder: group.sort_order,
            },
            children: taskNodes.length > 0 ? taskNodes : undefined,
          }
        })

        // Tasks directly under goal (no group)
        const directTasks = tasks.filter((t) => !t.group_id)
        const directTaskNodes: VisualTreeNode[] = directTasks.map((task) => {
          // Collect cross-links
          if (task.related_goal_ids?.length) {
            for (const relatedGoalId of task.related_goal_ids) {
              const targetGroupId = task.cross_link_group_map?.[relatedGoalId]
              crossLinks.push({
                sourceTaskId: task.id,
                targetGoalId: relatedGoalId,
                targetNodeId: targetGroupId ?? relatedGoalId,
                areaColor: area.color ?? '#8a8078',
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
              isPaused: task.status === 'paused',
              isCompletedTask: task.status === 'completed',
              repeatType: task.repeat_type,
              hasCrossLinks: (task.related_goal_ids?.length ?? 0) > 0,
              sortOrder: task.sort_order,
            },
          }
        })

        const allChildren = [...groupNodes, ...directTaskNodes]
        const totalStreak = tasks.reduce((sum, t) => sum + t.streak_count, 0)

        return {
          type: 'goal' as const,
          id: goal.id,
          name: goal.name,
          why: goal.why,
          status: goal.status,
          areaColor: area.color,
          meta: {
            count: tasks.length || undefined,
            totalStreak: totalStreak || undefined,
            targetDate: goal.target_date ?? undefined,
            sortOrder: goal.sort_order,
          },
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
        meta: { count: areaGoals.length, sortOrder: area.sort_order },
        children: goalNodes.length > 0 ? goalNodes : undefined,
      }
    })

  // Root: Direction
  const tree: VisualTreeNode = {
    type: 'direction',
    id: direction?.id || 'direction-root',
    name: direction?.statement || '나의 방향을 설정해주세요',
    why: direction?.why,
    meta: { count: areaNodes.length },
    children: areaNodes.length > 0 ? areaNodes : undefined,
  }

  return { tree, crossLinks }
}
