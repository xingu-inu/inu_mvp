import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { generateNKeysBetween } from '@/lib/fractional-index'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getGroupsByGoal as getGroupsByGoalAction,
  createGroup as createGroupAction,
  updateGroup as updateGroupAction,
  toggleGroupComplete as toggleGroupCompleteAction,
  deleteGroup as deleteGroupAction,
  reorderGroups as reorderGroupsAction,
  enableGoalGroups as enableGoalGroupsAction,
  disableGoalGroups as disableGoalGroupsAction,
} from '@/actions/group.actions'
import type { Goal, Group, CreateGroupInput, UpdateGroupInput } from '@/types/entities'

/**
 * goals 캐시 내 특정 goal의 groups를 optimistic하게 업데이트하는 헬퍼.
 * 이전 캐시 값을 반환하여 rollback에 사용.
 */
function updateGoalGroups(
  queryClient: QueryClient,
  goalId: string,
  updater: (groups: Group[]) => Group[]
): Goal[] | undefined {
  const previous = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)
  if (previous) {
    queryClient.setQueryData<Goal[]>(
      queryKeys.goals.all,
      previous.map((g) => (g.id === goalId ? { ...g, groups: updater(g.groups ?? []) } : g))
    )
  }
  return previous
}

/**
 * Goal별 Group 조회 wrapper
 */
async function fetchGroupsByGoal(goalId: string): Promise<Group[]> {
  const response = await getGroupsByGoalAction(goalId)
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * Goal별 Group 조회 hook
 */
export function useGroupsByGoal(goalId: string) {
  return useQuery({
    queryKey: queryKeys.groups.byGoal(goalId),
    queryFn: () => fetchGroupsByGoal(goalId),
    enabled: !!goalId,
    staleTime: STALE_TIMES.GROUP,
  })
}

/**
 * Group 생성 hook (Optimistic Insert)
 */
export function useCreateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateGroupInput) => {
      const response = await createGroupAction(input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      const now = new Date().toISOString()
      const tempGroup: Group = {
        id: crypto.randomUUID(),
        goal_id: input.goal_id,
        name: input.name,
        why: input.why ?? null,
        description: input.description ?? null,
        is_completed: false,
        sort_order: 'zzz',
        completed_at: null,
        created_at: now,
        updated_at: now,
      }

      const previousGoals = updateGoalGroups(queryClient, input.goal_id, (groups) => [
        ...groups,
        tempGroup,
      ])

      return { previousGoals }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }
      toast.error('그룹 추가에 실패했습니다.')
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.byGoal(input.goal_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
    },
    onSuccess: () => {
      toast.success('그룹이 추가되었습니다.')
    },
  })
}

/**
 * Group 수정 hook (Optimistic Update)
 */
export function useUpdateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateGroupInput; goalId: string }) => {
      const response = await updateGroupAction(id, input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async ({ id, input, goalId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      const previousGoals = updateGoalGroups(queryClient, goalId, (groups) =>
        groups.map((g) =>
          g.id === id ? { ...g, ...input, updated_at: new Date().toISOString() } : g
        )
      )

      return { previousGoals }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }
      toast.error('수정에 실패했습니다.')
    },
    onSettled: (_data, _err, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.byGoal(goalId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
    },
    onSuccess: () => {
      toast.success('그룹이 수정되었습니다.')
    },
  })
}

/**
 * Group 완료 토글 hook (Optimistic Update)
 */
export function useToggleGroupComplete() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      isCompleted,
    }: {
      id: string
      goalId: string
      isCompleted: boolean
    }) => {
      const response = await toggleGroupCompleteAction(id, isCompleted)
      if (!response.success) throw new Error(response.error.message)
      return response.data
    },
    onMutate: async ({ id, goalId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })
      const now = new Date().toISOString()
      const previousGoals = updateGoalGroups(queryClient, goalId, (groups) =>
        groups.map((g) =>
          g.id === id
            ? {
                ...g,
                is_completed: !g.is_completed,
                completed_at: !g.is_completed ? now : null,
                updated_at: now,
              }
            : g
        )
      )
      return { previousGoals }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousGoals)
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      toast.error('상태 변경에 실패했습니다.')
    },
    onSettled: (_data, _err, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.byGoal(goalId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}

/**
 * Group 삭제 hook (Optimistic Delete)
 */
export function useDeleteGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; goalId: string }) => {
      const response = await deleteGroupAction(id)
      if (!response.success) {
        throw new Error(response.error.message)
      }
    },
    onMutate: async ({ id, goalId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      const previousGoals = updateGoalGroups(queryClient, goalId, (groups) =>
        groups.filter((g) => g.id !== id)
      )

      return { previousGoals }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }
      toast.error('삭제에 실패했습니다.')
    },
    onSettled: (_data, _err, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.byGoal(goalId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
    },
    onSuccess: () => {
      toast.success('그룹이 삭제되었습니다.')
    },
  })
}

/**
 * Group 순서 변경 hook (Optimistic Update)
 */
export function useReorderGroups() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ goalId, ids }: { goalId: string; ids: string[] }) => {
      const response = await reorderGroupsAction(goalId, ids)
      if (!response.success) {
        throw new Error(response.error.message)
      }
    },
    onMutate: async ({ goalId, ids }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.groups.byGoal(goalId) })
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })
      const previous = queryClient.getQueryData<Group[]>(queryKeys.groups.byGoal(goalId))

      // Generate new sort_order keys matching server logic
      const keys = generateNKeysBetween(null, null, ids.length)
      const orderMap = new Map(ids.map((id, i) => [id, keys[i]]))

      if (previous) {
        queryClient.setQueryData<Group[]>(
          queryKeys.groups.byGoal(goalId),
          ids
            .map((id) => {
              const g = previous.find((gr) => gr.id === id)
              if (!g) return null
              return { ...g, sort_order: orderMap.get(id)! }
            })
            .filter(Boolean) as Group[]
        )
      }

      // Optimistic — goals.all (goal.groups[])
      const previousGoals = updateGoalGroups(
        queryClient,
        goalId,
        (groups) =>
          ids
            .map((id) => {
              const g = groups.find((gr) => gr.id === id)
              if (!g) return null
              return { ...g, sort_order: orderMap.get(id)! }
            })
            .filter(Boolean) as Group[]
      )

      return { previous, previousGoals, goalId }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.groups.byGoal(context.goalId), context.previous)
      }
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }
      toast.error('순서 변경에 실패했습니다.')
    },
    onSettled: (_data, _err, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.byGoal(goalId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}

/**
 * 그룹 관리 활성화 hook (Optimistic Update)
 */
export function useEnableGoalGroups() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ goalId, groupName }: { goalId: string; groupName?: string }) => {
      const response = await enableGoalGroupsAction(goalId, groupName)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async ({ goalId, groupName }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      const now = new Date().toISOString()
      const tempGroup: Group = {
        id: crypto.randomUUID(),
        goal_id: goalId,
        name: groupName ?? 'Group 1',
        why: null,
        description: null,
        is_completed: false,
        sort_order: 'a0',
        completed_at: null,
        created_at: now,
        updated_at: now,
      }

      const previousGoals = updateGoalGroups(queryClient, goalId, () => [tempGroup])

      return { previousGoals, goalId }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }
      toast.error('그룹 관리 활성화에 실패했습니다.')
    },
    onSettled: (_data, _err, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.byGoal(goalId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byGoal(goalId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home })
    },
    onSuccess: () => {
      toast.success('그룹 관리가 활성화되었습니다.')
    },
  })
}

/**
 * 그룹 관리 해제 hook (Optimistic Update)
 */
export function useDisableGoalGroups() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ goalId }: { goalId: string }) => {
      const response = await disableGoalGroupsAction(goalId)
      if (!response.success) {
        throw new Error(response.error.message)
      }
    },
    onMutate: async ({ goalId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      const previousGoals = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)
      if (previousGoals) {
        queryClient.setQueryData<Goal[]>(
          queryKeys.goals.all,
          previousGoals.map((g) => {
            if (g.id !== goalId) return g
            // 그룹 제거 + task의 group_id를 null로
            const tasks = (g.tasks ?? []).map((t) => ({ ...t, group_id: null }))
            return { ...g, groups: [], tasks }
          })
        )
      }

      return { previousGoals }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }
      toast.error('그룹 관리 해제에 실패했습니다.')
    },
    onSettled: (_data, _err, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.byGoal(goalId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byGoal(goalId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home })
    },
    onSuccess: () => {
      toast.success('그룹 관리가 해제되었습니다.')
    },
  })
}
