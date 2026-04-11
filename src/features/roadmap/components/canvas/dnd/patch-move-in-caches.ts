/**
 * Optimistic cache patcher for drag-and-drop reorder in the roadmap canvas.
 *
 * Updates every TanStack Query cache that may hold a moved node so the UI
 * reflects the change before the server mutation resolves. Rollback replays
 * the captured snapshot on failure.
 *
 * See CLAUDE.md: "Mutations must always use Optimistic Update: update all
 * related caches immediately in onMutate".
 */
import type { QueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query/keys'
import type { Area, Goal, Group, Task } from '@/types/entities'

export type MoveNodeType = 'area' | 'goal' | 'group' | 'task'

export interface MoveOptimisticInput {
  nodeType: MoveNodeType
  nodeId: string
  newOrder: string
  /** New parent id for cross-parent moves. undefined = same parent (sibling reorder). */
  newParentId?: string
  /** When a task moves onto a group, this is the group id (newParentId is the parent goal). */
  newGroupId?: string | null
}

export interface CacheSnapshot {
  /** Original cache contents keyed by queryKey for rollback. */
  previous: Array<{ key: readonly unknown[]; data: unknown }>
}

// ------------------------------------------------------------------
// Shared helpers
// ------------------------------------------------------------------

function sortBySortOrder<T extends { sort_order: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.sort_order.localeCompare(b.sort_order))
}

function snapshotKey(
  queryClient: QueryClient,
  key: readonly unknown[],
  snapshot: CacheSnapshot
): void {
  snapshot.previous.push({ key, data: queryClient.getQueryData(key) })
}

// ------------------------------------------------------------------
// Per-entity patchers
// ------------------------------------------------------------------

function patchArea(
  queryClient: QueryClient,
  input: MoveOptimisticInput,
  snapshot: CacheSnapshot
): void {
  const key = queryKeys.areas.all
  snapshotKey(queryClient, key, snapshot)
  const areas = queryClient.getQueryData<Area[]>(key)
  if (!areas) return
  const next = areas.map((a) => (a.id === input.nodeId ? { ...a, sort_order: input.newOrder } : a))
  queryClient.setQueryData<Area[]>(key, next)
}

function patchGoal(
  queryClient: QueryClient,
  input: MoveOptimisticInput,
  snapshot: CacheSnapshot
): void {
  const key = queryKeys.goals.all
  snapshotKey(queryClient, key, snapshot)
  const goals = queryClient.getQueryData<Goal[]>(key)
  if (!goals) return
  const next = goals.map((g) =>
    g.id === input.nodeId
      ? {
          ...g,
          sort_order: input.newOrder,
          area_id: input.newParentId ?? g.area_id,
        }
      : g
  )
  queryClient.setQueryData<Goal[]>(key, next)
}

function patchGroup(
  queryClient: QueryClient,
  input: MoveOptimisticInput,
  snapshot: CacheSnapshot
): void {
  // 1. Flat groups cache.
  const groupsKey = queryKeys.groups.all
  snapshotKey(queryClient, groupsKey, snapshot)
  const flatGroups = queryClient.getQueryData<Group[]>(groupsKey)
  if (flatGroups) {
    const nextFlat = flatGroups.map((g) =>
      g.id === input.nodeId
        ? {
            ...g,
            sort_order: input.newOrder,
            goal_id: input.newParentId ?? g.goal_id,
          }
        : g
    )
    queryClient.setQueryData<Group[]>(groupsKey, nextFlat)
  }

  // 2. Nested groups on each Goal in the goals cache.
  const goalsKey = queryKeys.goals.all
  snapshotKey(queryClient, goalsKey, snapshot)
  const goals = queryClient.getQueryData<Goal[]>(goalsKey)
  if (!goals) return

  // Find the moved group's current location.
  let moved: Group | undefined
  for (const goal of goals) {
    const found = goal.groups?.find((g) => g.id === input.nodeId)
    if (found) {
      moved = found
      break
    }
  }
  if (!moved) return

  const updatedGroup: Group = {
    ...moved,
    sort_order: input.newOrder,
    goal_id: input.newParentId ?? moved.goal_id,
  }
  const targetGoalId = updatedGroup.goal_id

  const nextGoals = goals.map((goal) => {
    const currentGroups = goal.groups ?? []
    const hadIt = currentGroups.some((g) => g.id === input.nodeId)
    const isTarget = goal.id === targetGoalId

    if (!hadIt && !isTarget) return goal

    const without = currentGroups.filter((g) => g.id !== input.nodeId)
    const nextGroups = isTarget ? sortBySortOrder<Group>([...without, updatedGroup]) : without
    return { ...goal, groups: nextGroups }
  })
  queryClient.setQueryData<Goal[]>(goalsKey, nextGoals)
}

function patchTask(
  queryClient: QueryClient,
  input: MoveOptimisticInput,
  snapshot: CacheSnapshot
): void {
  // 1. Flat tasks cache.
  const tasksKey = queryKeys.tasks.all
  snapshotKey(queryClient, tasksKey, snapshot)
  const flatTasks = queryClient.getQueryData<Task[]>(tasksKey)
  if (flatTasks) {
    const nextFlat = flatTasks.map((t) =>
      t.id === input.nodeId
        ? {
            ...t,
            sort_order: input.newOrder,
            goal_id: input.newParentId ?? t.goal_id,
            group_id: input.newGroupId === undefined ? t.group_id : input.newGroupId,
          }
        : t
    )
    queryClient.setQueryData<Task[]>(tasksKey, nextFlat)
  }

  // 2. Nested tasks on each Goal.
  const goalsKey = queryKeys.goals.all
  snapshotKey(queryClient, goalsKey, snapshot)
  const goals = queryClient.getQueryData<Goal[]>(goalsKey)
  if (!goals) return

  let moved: Task | undefined
  for (const goal of goals) {
    const found = goal.tasks?.find((t) => t.id === input.nodeId)
    if (found) {
      moved = found
      break
    }
  }
  if (!moved) return

  const updatedTask: Task = {
    ...moved,
    sort_order: input.newOrder,
    goal_id: input.newParentId ?? moved.goal_id,
    group_id: input.newGroupId === undefined ? moved.group_id : input.newGroupId,
  }
  const targetGoalId = updatedTask.goal_id

  const nextGoals = goals.map((goal) => {
    const currentTasks = goal.tasks ?? []
    const hadIt = currentTasks.some((t) => t.id === input.nodeId)
    const isTarget = goal.id === targetGoalId

    if (!hadIt && !isTarget) return goal

    const without = currentTasks.filter((t) => t.id !== input.nodeId)
    const nextTasks = isTarget ? sortBySortOrder<Task>([...without, updatedTask]) : without
    return { ...goal, tasks: nextTasks }
  })
  queryClient.setQueryData<Goal[]>(goalsKey, nextGoals)
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

export function patchMoveInCaches(
  queryClient: QueryClient,
  input: MoveOptimisticInput
): CacheSnapshot {
  const snapshot: CacheSnapshot = { previous: [] }

  switch (input.nodeType) {
    case 'area':
      patchArea(queryClient, input, snapshot)
      break
    case 'goal':
      patchGoal(queryClient, input, snapshot)
      break
    case 'group':
      patchGroup(queryClient, input, snapshot)
      break
    case 'task':
      patchTask(queryClient, input, snapshot)
      break
  }

  return snapshot
}

export function rollbackMovePatch(queryClient: QueryClient, snapshot: CacheSnapshot): void {
  for (const entry of snapshot.previous) {
    queryClient.setQueryData(entry.key, entry.data)
  }
}
