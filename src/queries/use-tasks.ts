import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { generateNKeysBetween } from '@/lib/fractional-index'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getTasks as getTasksAction,
  getTasksToday as getTodayTasksAction,
  getTasksByGoal as getTasksByGoalAction,
  createTask as createTaskAction,
  updateTask as updateTaskAction,
  deleteTask as deleteTaskAction,
  reorderTasks as reorderTasksAction,
} from '@/actions'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { Goal, Task, CreateTaskInput, UpdateTaskInput } from '@/types/entities'

/** Helper: optimistically patch a task inside the goals.all cache */
function patchTaskInGoals(goals: Goal[], taskId: string, patch: Partial<Task>): Goal[] {
  return goals.map((g) => ({
    ...g,
    tasks: (g.tasks ?? []).map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
  }))
}

/**
 * 전체 Task 조회 wrapper
 */
async function fetchTasks(): Promise<Task[]> {
  const response = await getTasksAction()
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * 오늘의 Task 조회 wrapper
 */
async function fetchTodayTasks(date: string): Promise<Task[]> {
  const response = await getTodayTasksAction(date)
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * Goal별 Task 조회 wrapper
 */
async function fetchTasksByGoal(goalId: string): Promise<Task[]> {
  const response = await getTasksByGoalAction(goalId)
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * 전체 Task 조회 hook
 */
export function useTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.all,
    queryFn: fetchTasks,
    staleTime: STALE_TIMES.TASK,
  })
}

/**
 * 오늘의 Task 조회 hook
 */
export function useTodayTasks(date: Date = new Date()) {
  const dateStr = format(date, 'yyyy-MM-dd')

  return useQuery({
    queryKey: queryKeys.tasks.home(dateStr),
    queryFn: () => fetchTodayTasks(dateStr),
    staleTime: STALE_TIMES.HOME_TASKS,
  })
}

/**
 * Goal별 Task 조회 hook
 */
export function useTasksByGoal(goalId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.byGoal(goalId),
    queryFn: () => fetchTasksByGoal(goalId),
    enabled: !!goalId,
    staleTime: STALE_TIMES.TASK,
  })
}

/**
 * Task 생성 hook (Optimistic Insert)
 */
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ _tempId, ...input }: CreateTaskInput) => {
      const response = await createTaskAction(input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      const now = new Date().toISOString()
      const tempTask: Task = {
        id: input._tempId ?? crypto.randomUUID(),
        user_id: '',
        goal_id: input.goal_id ?? null,
        group_id: input.group_id ?? null,
        area_id: input.area_id ?? null,
        name: input.name,
        why: input.why ?? null,
        repeat_type: input.repeat_type ?? 'daily',
        repeat_days: input.repeat_days ?? null,
        duration_minutes: input.duration_minutes ?? 15,
        time_slot: input.time_slot ?? 'anytime',
        specific_time: input.specific_time ?? null,
        streak_count: 0,
        best_streak: 0,
        last_check_in_date: null,
        is_active: true,
        status: 'active',
        scheduled_date: input.scheduled_date ?? null,
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        completed_at: null,
        paused_at: null,
        status_change_reason: null,
        status_change_note: null,
        sort_order: 'zzz',
        related_area_ids: input.related_area_ids ?? [],
        related_goal_ids: input.related_goal_ids ?? [],
        cross_link_group_map: {},
        google_event_id: null,
        created_at: now,
        updated_at: now,
      }

      // Update ['tasks'] cache
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks.all)
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(queryKeys.tasks.all, [...previousTasks, tempTask])
      }

      // Update ['goals'] cache (goal.tasks[])
      let previousGoals: Goal[] | undefined
      if (input.goal_id) {
        previousGoals = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)
        if (previousGoals) {
          queryClient.setQueryData<Goal[]>(
            queryKeys.goals.all,
            previousGoals.map((g) =>
              g.id === input.goal_id ? { ...g, tasks: [...(g.tasks ?? []), tempTask] } : g
            )
          )
        }
      }

      return { previousTasks, previousGoals }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previousTasks)
      }
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }
      toast.error('할 일 추가에 실패했습니다.')
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      if (input.goal_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byGoal(input.goal_id) })
      }
    },
    onSuccess: (_data, input) => {
      trackEvent(ANALYTICS_EVENTS.TASK_CREATED, {
        goal_id: input.goal_id,
        repeat_type: input.repeat_type,
        time_slot: input.time_slot,
      })
      toast.success('할 일이 추가되었어요')
    },
  })
}

/**
 * Task 수정 hook (Optimistic Update)
 */
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTaskInput }) => {
      const response = await updateTaskAction(id, input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks.all)
      const previousGoals = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)

      const patch = { ...input, updated_at: new Date().toISOString() }

      // Optimistic Update — tasks.all
      if (previous) {
        queryClient.setQueryData<Task[]>(
          queryKeys.tasks.all,
          previous.map((task) => (task.id === id ? { ...task, ...patch } : task))
        )
      }

      // Optimistic Update — goals.all (goal.tasks[])
      if (previousGoals) {
        queryClient.setQueryData<Goal[]>(
          queryKeys.goals.all,
          patchTaskInGoals(previousGoals, id, patch)
        )
      }

      return { previous, previousGoals }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previous)
      }
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }
      toast.error('수정에 실패했습니다.')
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      // 구조적 변경(goal/group 이동 등)일 때만 goals 전체 invalidation
      const structuralKeys = ['goal_id', 'group_id', 'is_active']
      if (Object.keys(variables.input).some((k) => structuralKeys.includes(k))) {
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      }
      if (variables.input.status) {
        queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
      }
    },
    onSuccess: (_data, { input }) => {
      // Suppress toast for DnD operations (only sort_order/group_id changes)
      const keys = Object.keys(input)
      const isDndMove = keys.length > 0 && keys.every((k) => k === 'sort_order' || k === 'group_id')
      if (!isDndMove) {
        toast.success('할 일이 수정되었습니다.')
      }
    },
  })
}

/**
 * Task 삭제 hook (Optimistic Delete)
 */
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteTaskAction(id)
      if (!response.success) {
        throw new Error(response.error.message)
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks.all)

      // Optimistic Delete — tasks.all
      if (previous) {
        queryClient.setQueryData<Task[]>(
          queryKeys.tasks.all,
          previous.filter((task) => task.id !== id)
        )
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previous)
      }
      toast.error('삭제에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
    onSuccess: () => {
      toast.success('할 일이 삭제되었습니다.')
    },
  })
}

/**
 * Task 순서 변경 hook (Optimistic Update)
 */
export function useReorderTasks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ goalId, ids }: { goalId: string; ids: string[] }) => {
      const response = await reorderTasksAction(goalId, ids)
      if (!response.success) {
        throw new Error(response.error.message)
      }
    },
    onMutate: async ({ goalId, ids }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.byGoal(goalId) })
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks.byGoal(goalId))
      const previousGoals = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)

      // Generate new sort_order keys matching server logic
      const keys = generateNKeysBetween(null, null, ids.length)
      const orderMap = new Map(ids.map((id, i) => [id, keys[i]]))

      // Optimistic — tasks.byGoal
      if (previous) {
        const updated = previous.map((t) => {
          const newOrder = orderMap.get(t.id)
          return newOrder ? { ...t, sort_order: newOrder } : t
        })
        updated.sort((a, b) => a.sort_order.localeCompare(b.sort_order))
        queryClient.setQueryData<Task[]>(queryKeys.tasks.byGoal(goalId), updated)
      }

      // Optimistic — goals.all (goal.tasks[])
      if (previousGoals) {
        queryClient.setQueryData<Goal[]>(
          queryKeys.goals.all,
          previousGoals.map((g) => {
            if (g.id !== goalId) return g
            const tasks = (g.tasks ?? []).map((t) => {
              const newOrder = orderMap.get(t.id)
              return newOrder ? { ...t, sort_order: newOrder } : t
            })
            tasks.sort((a, b) => (a.sort_order ?? '').localeCompare(b.sort_order ?? ''))
            return { ...g, tasks }
          })
        )
      }

      return { previous, previousGoals, goalId }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks.byGoal(context.goalId), context.previous)
      }
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }
      toast.error('순서 변경에 실패했습니다.')
    },
    onSettled: (_data, _err, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byGoal(goalId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}
