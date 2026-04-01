import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { STATUS_CHANGE_MESSAGES } from '@/lib/goal-status'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getGoals as getGoalsAction,
  getGoalsByStatus as getGoalsByStatusAction,
  getGoalsByArea as getGoalsByAreaAction,
  getGoalDetail as getGoalDetailAction,
  createGoal as createGoalAction,
  updateGoal as updateGoalAction,
  deleteGoal as deleteGoalAction,
} from '@/actions/goal.actions'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import type {
  Goal,
  GoalStatus,
  Group,
  Task,
  CreateGoalInput,
  UpdateGoalInput,
} from '@/types/entities'

/**
 * 전체 Goal 조회 wrapper
 */
async function fetchGoals(): Promise<Goal[]> {
  const response = await getGoalsAction()
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * 상태별 Goal 조회 wrapper
 */
async function fetchGoalsByStatus(status: GoalStatus): Promise<Goal[]> {
  const response = await getGoalsByStatusAction(status)
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * Area별 Goal 조회 wrapper
 */
async function fetchGoalsByArea(areaId: string): Promise<Goal[]> {
  const response = await getGoalsByAreaAction(areaId)
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * Goal 상세 조회 wrapper
 */
async function fetchGoalDetail(id: string): Promise<Goal | null> {
  const response = await getGoalDetailAction(id)
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * Goal 조회 hook (상태 필터 옵션)
 */
export function useGoals(status?: GoalStatus) {
  return useQuery({
    queryKey: status ? queryKeys.goals.byStatus(status) : queryKeys.goals.all,
    queryFn: () => (status ? fetchGoalsByStatus(status) : fetchGoals()),
    staleTime: STALE_TIMES.GOAL,
  })
}

/**
 * Area별 Goal 조회 hook
 */
export function useGoalsByArea(areaId: string) {
  return useQuery({
    queryKey: queryKeys.goals.byArea(areaId),
    queryFn: () => fetchGoalsByArea(areaId),
    enabled: !!areaId,
    staleTime: STALE_TIMES.GOAL,
  })
}

/**
 * Goal 상세 조회 hook
 */
export function useGoal(id: string) {
  return useQuery({
    queryKey: queryKeys.goals.detail(id),
    queryFn: () => fetchGoalDetail(id),
    enabled: !!id,
    staleTime: STALE_TIMES.GOAL,
  })
}

/**
 * useGoals() 캐시에서 단일 Goal + 정렬된 groups/tasks를 derive하는 훅.
 * 추가 네트워크 요청 없이 기존 캐시를 재활용한다.
 */
export function useGoalWithRelations(goalId: string) {
  const { data: goals, isLoading } = useGoals()

  const result = useMemo(() => {
    if (!goals) return { goal: null, groups: [] as Group[], tasks: [] as Task[] }
    const goal = goals.find((g) => g.id === goalId) ?? null
    return {
      goal,
      groups: [...(goal?.groups ?? [])].sort((a, b) => a.sort_order.localeCompare(b.sort_order)),
      tasks: [...(goal?.tasks ?? [])].sort((a, b) => a.sort_order.localeCompare(b.sort_order)),
    }
  }, [goals, goalId])

  return { ...result, isLoading }
}

/**
 * Goal 생성 hook (Optimistic Insert)
 */
export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ _tempId, ...input }: CreateGoalInput) => {
      const response = await createGoalAction(input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })
      const previous = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)

      const now = new Date().toISOString()
      const tempGoal: Goal = {
        id: input._tempId ?? crypto.randomUUID(),
        user_id: '',
        area_id: input.area_id,
        name: input.name,
        why: input.why ?? null,
        vision: input.vision ?? null,
        status: input.status ?? 'active',
        start_date: input.start_date ?? null,
        target_date: input.target_date ?? null,
        completed_at: null,
        sort_order: 'zzz',
        status_change_reason: null,
        status_change_note: null,
        impact_area_ids: input.impact_area_ids ?? [],
        created_at: now,
        updated_at: now,
        groups: [],
        tasks: [],
      }

      if (previous) {
        queryClient.setQueryData<Goal[]>(queryKeys.goals.all, [...previous, tempGoal])
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.goals.all, context.previous)
      }
      toast.error('목표 추가에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
    onSuccess: (_data, input) => {
      trackEvent(ANALYTICS_EVENTS.GOAL_CREATED, { area_id: input.area_id, status: input.status })
      toast.success('목표가 추가되었습니다.')
    },
  })
}

/**
 * Goal 수정 hook (Optimistic Update)
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: UpdateGoalInput
      previousStatus?: GoalStatus
    }) => {
      const response = await updateGoalAction(id, input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })
      const previous = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)

      if (previous) {
        queryClient.setQueryData<Goal[]>(
          queryKeys.goals.all,
          previous.map((goal) =>
            goal.id === id ? { ...goal, ...input, updated_at: new Date().toISOString() } : goal
          )
        )
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.goals.all, context.previous)
      }
      toast.error('수정에 실패했습니다.')
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
      // Goal 상태 변경 시 Home 캐시 갱신
      if (variables.input.status) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home })
        queryClient.invalidateQueries({ queryKey: ['tasks', 'home'] })
      }
    },
    onSuccess: (_data, { id, input, previousStatus }) => {
      if (input.status && previousStatus && input.status !== previousStatus) {
        trackEvent(ANALYTICS_EVENTS.GOAL_STATUS_CHANGED, {
          from: previousStatus,
          to: input.status,
        })
        if (input.status === 'completed') {
          trackEvent(ANALYTICS_EVENTS.GOAL_COMPLETED, { goal_id: id })
        }
        const message = STATUS_CHANGE_MESSAGES[input.status]
        if (message) {
          toast.success(message)
          return
        }
      }
      toast.success('목표가 수정되었습니다.')
    },
  })
}

/**
 * Goal 삭제 hook (Optimistic Delete)
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteGoalAction(id)
      if (!response.success) {
        throw new Error(response.error.message)
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })
      const previous = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)

      if (previous) {
        queryClient.setQueryData<Goal[]>(
          queryKeys.goals.all,
          previous.filter((goal) => goal.id !== id)
        )
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.goals.all, context.previous)
      }
      toast.error('삭제에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
    onSuccess: () => {
      toast.success('목표가 삭제되었습니다.')
    },
  })
}
