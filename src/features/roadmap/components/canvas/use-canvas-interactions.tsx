'use client'

import { useMemo, useState, useCallback, useRef, type ReactNode } from 'react'
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

  // Refs for optimistic quick-create → instant inline editing
  const pendingEditValueRef = useRef<string | null>(null)
  const tempToRealIdRef = useRef<Map<string, string>>(new Map())
  const pendingTempIdsRef = useRef<Set<string>>(new Set())
  const pendingRenameRef = useRef<{
    nodeType: SelectedNodeType
    tempId: string
    name: string
    extra?: Record<string, unknown>
  } | null>(null)

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

  /** Fire the actual rename mutation for a resolved (real) ID. */
  const dispatchRename = useCallback(
    (nodeType: SelectedNodeType, id: string, name: string, extra?: Record<string, unknown>) => {
      switch (nodeType) {
        case 'area':
          updateArea.mutate({ id, input: { name } })
          break
        case 'goal':
          updateGoal.mutate({ id, input: { name, ...extra } })
          break
        case 'group': {
          const goalId = parentGoalMap.get(id)
          if (goalId) updateGroup.mutate({ id, input: { name }, goalId })
          break
        }
        case 'task':
          updateTask.mutate({ id, input: { name } })
          break
      }
    },
    [updateArea, updateGoal, updateGroup, updateTask, parentGoalMap]
  )

  /** Swap editingNodeId from temp to real and flush any pending rename. */
  const resolveCreatedNode = useCallback(
    (tempId: string, data: { id: string } | null) => {
      pendingTempIdsRef.current.delete(tempId)
      if (!data) return

      tempToRealIdRef.current.set(tempId, data.id)
      setEditingNodeId((prev) => (prev === tempId ? data.id : prev))

      // Flush pending rename committed before server responded
      const pending = pendingRenameRef.current
      if (pending?.tempId === tempId) {
        pendingRenameRef.current = null
        dispatchRename(pending.nodeType, data.id, pending.name, pending.extra)
      }

      // Clean up mapping after 10s
      setTimeout(() => tempToRealIdRef.current.delete(tempId), 10_000)
    },
    [dispatchRename]
  )

  const handleQuickCreate = useCallback(
    async (parentType: SelectedNodeType, parentId: string) => {
      setAddingToId(null)
      const tempId = crypto.randomUUID()
      pendingEditValueRef.current = null
      pendingTempIdsRef.current.add(tempId)

      // Set editing immediately so inline input appears on the optimistic node
      setEditingNodeId(tempId)

      try {
        switch (parentType) {
          case 'direction': {
            const data = await createArea.mutateAsync({
              _tempId: tempId,
              name: '새 영역',
              emoji: '📌',
              color: '#6366f1',
            })
            resolveCreatedNode(tempId, data)
            break
          }
          case 'area': {
            const data = await createGoal.mutateAsync({
              _tempId: tempId,
              area_id: parentId,
              name: '새 목표',
            })
            resolveCreatedNode(tempId, data)
            break
          }
          case 'goal': {
            expandGoal?.(parentId)
            const data = await createTask.mutateAsync({
              _tempId: tempId,
              goal_id: parentId,
              name: '새 할일',
              repeat_type: 'daily',
            })
            resolveCreatedNode(tempId, data)
            break
          }
          case 'group': {
            const goalId = parentGoalMap.get(parentId)
            if (!goalId) return
            expandGoal?.(goalId)
            expandGroup?.(parentId)
            const data = await createTask.mutateAsync({
              _tempId: tempId,
              goal_id: goalId,
              group_id: parentId,
              name: '새 할일',
              repeat_type: 'daily',
            })
            resolveCreatedNode(tempId, data)
            break
          }
        }
      } catch {
        // Mutation error handled by onError in each hook; clear editing state
        pendingTempIdsRef.current.delete(tempId)
        setEditingNodeId((prev) => (prev === tempId ? null : prev))
        pendingEditValueRef.current = null
      }
    },
    [createArea, createGoal, createTask, parentGoalMap, expandGoal, expandGroup, resolveCreatedNode]
  )

  const handleRenameCommit = useCallback(
    (
      nodeType: SelectedNodeType,
      nodeId: string,
      newName: string,
      extra?: Record<string, unknown>
    ) => {
      const trimmed = newName.trim()
      setEditingNodeId(null)
      pendingEditValueRef.current = null
      pendingRenameRef.current = null

      if (!trimmed) return

      // Resolve temp ID → real ID if server already responded
      const resolvedId = tempToRealIdRef.current.get(nodeId) ?? nodeId

      if (pendingTempIdsRef.current.has(nodeId)) {
        // Server hasn't responded yet — defer rename until resolveCreatedNode fires
        pendingRenameRef.current = { nodeType, tempId: nodeId, name: trimmed, extra }
      } else {
        dispatchRename(nodeType, resolvedId, trimmed, extra)
      }
    },
    [dispatchRename]
  )

  const handleStartEdit = useCallback((type: SelectedNodeType, id: string) => {
    if (type === 'direction') return
    pendingEditValueRef.current = null
    setEditingNodeId(id)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null)
    pendingEditValueRef.current = null
  }, [])

  return {
    selectedNodeId,
    focusedIds,
    addingToId,
    editingNodeId,
    directionId,
    pendingEditValueRef,
    handleNodeSelect,
    handleDeleteNode,
    handleStartAdd,
    handleCancelAdd,
    getQuickAddContent,
    handleStartEdit,
    handleQuickCreate,
    handleRenameCommit,
    handleCancelEdit,
    parentGoalMap,
    parentGroupMap,
  }
}
