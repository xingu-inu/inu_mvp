'use client'

import { useMemo, useState, useCallback, type ReactNode } from 'react'
import {
  useRoadmapStore,
  selectSelectedNodeId,
  type SelectedNodeType,
  type Selection,
} from '@/stores/roadmap.store'
import { useFocusBranch } from '../../hooks/use-focus-branch'
import { useDeleteArea } from '@/queries/use-areas'
import { useDeleteGoal } from '@/queries/use-goals'
import { useDeleteGroup } from '@/queries/use-groups'
import { useDeleteTask } from '@/queries/use-tasks'
import { TreeQuickAdd } from '../visual-tree/tree-quick-add'
import type { VisualTreeNode } from '../visual-tree/tree-node-card'
import type { Area, Goal } from '@/types/entities'
import type { AreaType } from '@/types/entities'

export function useCanvasInteractions(
  treeData: VisualTreeNode | null,
  goals: Goal[],
  areas: Area[]
) {
  const selectedNodeId = useRoadmapStore(selectSelectedNodeId)
  const select = useRoadmapStore((s) => s.select)
  const focusGoal = useRoadmapStore((s) => s.focusGoal)

  const [addingToId, setAddingToId] = useState<string | null>(null)

  // Focus mode
  const focusedIds = useFocusBranch(treeData, selectedNodeId)

  // Delete mutations
  const deleteArea = useDeleteArea()
  const deleteGoal = useDeleteGoal()
  const deleteGroup = useDeleteGroup()
  const deleteTask = useDeleteTask()

  // Map group/task IDs → parent goal ID
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

  // Map area ID → area type
  const areaTypeMap = useMemo(() => {
    const map = new Map<string, AreaType>()
    for (const area of areas) {
      map.set(area.id, area.type as AreaType)
    }
    return map
  }, [areas])

  // Map goal ID → area ID
  const goalAreaMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const goal of goals) {
      map.set(goal.id, goal.area_id)
    }
    return map
  }, [goals])

  const handleNodeSelect = useCallback(
    (type: SelectedNodeType, id: string) => {
      if (type === 'goal') {
        focusGoal(id)
      } else if (type === 'group') {
        const goalId = parentGoalMap.get(id)
        if (goalId) {
          useRoadmapStore.setState({
            selection: { type: 'group', id, goalId } as Selection,
            focusedGoalId: goalId,
            inlineMode: { type: 'edit-group', groupId: id },
          })
        }
      } else if (type === 'task') {
        const goalId = parentGoalMap.get(id)
        if (goalId) {
          useRoadmapStore.setState({
            selection: { type: 'task', id, goalId } as Selection,
            focusedGoalId: goalId,
            inlineMode: { type: 'edit-task', taskId: id },
          })
        }
      } else {
        select({ type: type as 'direction' | 'area', id })
      }
    },
    [focusGoal, select, parentGoalMap]
  )

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

  const handleStartAdd = useCallback((_type: SelectedNodeType, id: string) => {
    setAddingToId(id)
  }, [])

  const handleCancelAdd = useCallback(() => {
    setAddingToId(null)
  }, [])

  const getQuickAddContent = useCallback(
    (node: VisualTreeNode): ReactNode => {
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

  return {
    selectedNodeId,
    focusedIds,
    addingToId,
    handleNodeSelect,
    handleDeleteNode,
    handleStartAdd,
    handleCancelAdd,
    getQuickAddContent,
    parentGoalMap,
  }
}
