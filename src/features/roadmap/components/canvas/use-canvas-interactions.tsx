'use client'

import { useMemo, useState, useCallback, type ReactNode } from 'react'
import {
  useRoadmapStore,
  selectSelectedNodeId,
  type SelectedNodeType,
  type Selection,
} from '@/stores/roadmap.store'
import { useFocusBranch } from '../../hooks/use-focus-branch'
import { useCreateArea, useUpdateArea, useDeleteArea } from '@/queries/use-areas'
import { useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/queries/use-goals'
import { useUpdateGroup, useDeleteGroup } from '@/queries/use-groups'
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/queries/use-tasks'
import { TreeQuickAdd } from '../visual-tree/tree-quick-add'
import type { VisualTreeNode } from '../visual-tree/tree-node-card'
import type { Area, Goal } from '@/types/entities'
import type { AreaType } from '@/types/entities'

export function useCanvasInteractions(
  treeData: VisualTreeNode | null,
  goals: Goal[],
  areas: Area[],
  expandGoal?: (goalId: string) => void,
  expandGroup?: (groupId: string) => void
) {
  const selectedNodeId = useRoadmapStore(selectSelectedNodeId)
  const select = useRoadmapStore((s) => s.select)
  const focusGoal = useRoadmapStore((s) => s.focusGoal)

  const [addingToId, setAddingToId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const directionId = treeData?.id ?? null

  // Focus mode
  const focusedIds = useFocusBranch(treeData, selectedNodeId)

  // Mutations
  const createArea = useCreateArea()
  const createGoal = useCreateGoal()
  const createTask = useCreateTask()
  const updateArea = useUpdateArea()
  const updateGoal = useUpdateGoal()
  const updateGroup = useUpdateGroup()
  const updateTask = useUpdateTask()
  const deleteArea = useDeleteArea()
  const deleteGoal = useDeleteGoal()
  const deleteGroup = useDeleteGroup()
  const deleteTask = useDeleteTask()

  // Map group/task IDs → parent goal ID.
  // Note: uses ALL goals regardless of statusFilter. Filtered-out goals' nodes
  // don't appear on canvas, so lookups for them are harmless no-ops.
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

  // Map task IDs → parent group ID (only for tasks with a group)
  const parentGroupMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const goal of goals) {
      for (const group of goal.groups || []) {
        for (const task of (goal.tasks || []).filter((t) => t.group_id === group.id)) {
          map.set(task.id, group.id)
        }
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
            isFloatingPanelOpen: true,
          })
        }
      } else if (type === 'task') {
        const goalId = parentGoalMap.get(id)
        if (goalId) {
          useRoadmapStore.setState({
            selection: { type: 'task', id, goalId } as Selection,
            focusedGoalId: goalId,
            inlineMode: { type: 'edit-task', taskId: id },
            isFloatingPanelOpen: true,
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
        case 'direction':
          // Direction node cannot be deleted from canvas
          return
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

  const handleQuickCreate = useCallback(
    async (parentType: SelectedNodeType, parentId: string) => {
      setAddingToId(null)

      try {
        switch (parentType) {
          case 'direction': {
            const data = await createArea.mutateAsync({
              name: '새 영역',
              emoji: '📌',
              color: '#6366f1',
            })
            if (data) setEditingNodeId(data.id)
            break
          }
          case 'area': {
            const data = await createGoal.mutateAsync({ area_id: parentId, name: '새 목표' })
            if (data) setEditingNodeId(data.id)
            break
          }
          case 'goal': {
            expandGoal?.(parentId)
            const data = await createTask.mutateAsync({
              goal_id: parentId,
              name: '새 할일',
              repeat_type: 'daily',
            })
            if (data) setEditingNodeId(data.id)
            break
          }
          case 'group': {
            const goalId = parentGoalMap.get(parentId)
            if (!goalId) return
            expandGoal?.(goalId)
            expandGroup?.(parentId)
            const data = await createTask.mutateAsync({
              goal_id: goalId,
              group_id: parentId,
              name: '새 할일',
              repeat_type: 'daily',
            })
            if (data) setEditingNodeId(data.id)
            break
          }
        }
      } catch {
        // Mutation error already handled by onError in each hook
      }
    },
    [createArea, createGoal, createTask, parentGoalMap, expandGoal, expandGroup]
  )

  const handleRenameCommit = useCallback(
    (nodeType: SelectedNodeType, nodeId: string, newName: string) => {
      const trimmed = newName.trim()
      if (!trimmed) {
        setEditingNodeId(null)
        return
      }
      setEditingNodeId(null)

      switch (nodeType) {
        case 'area':
          updateArea.mutate({ id: nodeId, input: { name: trimmed } })
          break
        case 'goal':
          updateGoal.mutate({ id: nodeId, input: { name: trimmed } })
          break
        case 'group': {
          const goalId = parentGoalMap.get(nodeId)
          if (goalId) updateGroup.mutate({ id: nodeId, input: { name: trimmed }, goalId })
          break
        }
        case 'task':
          updateTask.mutate({ id: nodeId, input: { name: trimmed } })
          break
      }
    },
    [updateArea, updateGoal, updateGroup, updateTask, parentGoalMap]
  )

  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null)
  }, [])

  return {
    selectedNodeId,
    focusedIds,
    addingToId,
    editingNodeId,
    directionId,
    handleNodeSelect,
    handleDeleteNode,
    handleStartAdd,
    handleCancelAdd,
    getQuickAddContent,
    handleQuickCreate,
    handleRenameCommit,
    handleCancelEdit,
    parentGoalMap,
    parentGroupMap,
  }
}
