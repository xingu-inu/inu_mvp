import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO, getDay } from 'date-fns'
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
import { usePanelDateStore } from '@/stores/panel-date.store'
import type { Area, Goal, Task, HomeTask, CreateTaskInput, UpdateTaskInput } from '@/types/entities'
import type { HomeTask as ActionHomeTask } from '@/actions/home.actions'

/** Helper: optimistically patch a task inside the goals.all cache */
function patchTaskInGoals(goals: Goal[], taskId: string, patch: Partial<Task>): Goal[] {
  return goals.map((g) => ({
    ...g,
    tasks: (g.tasks ?? []).map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
  }))
}

/** Check if a task with given repeat config should appear on a specific date */
function shouldInsertOnDate(
  repeatType: string,
  repeatDays: number[] | null | undefined,
  scheduledDate: string | null | undefined,
  dateStr: string
): boolean {
  const dayOfWeek = getDay(parseISO(dateStr))
  switch (repeatType) {
    case 'daily':
      return true
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6
    case 'weekly':
    case 'custom':
      return repeatDays?.includes(dayOfWeek) ?? false
    case 'once':
      return dateStr === scheduledDate
    default:
      return false
  }
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
    mutationFn: async (input: CreateTaskInput) => {
      const response = await createTaskAction(input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })
      await queryClient.cancelQueries({ queryKey: ['tasks', 'home'] })

      const now = new Date().toISOString()
      const tempTask: Task = {
        id: crypto.randomUUID(),
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

      // Lookup goal/area from cache for correct optimistic grouping
      const cachedGoals = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)
      const cachedAreas = queryClient.getQueryData<Area[]>(queryKeys.areas.all)

      let optimisticGoal: ActionHomeTask['goal'] = null
      let optimisticDirectArea: ActionHomeTask['directArea'] = null

      if (input.goal_id && cachedGoals) {
        const g = cachedGoals.find((goal) => goal.id === input.goal_id)
        if (g) {
          const a = cachedAreas?.find((area) => area.id === g.area_id)
          if (a) {
            optimisticGoal = {
              id: g.id,
              name: g.name,
              why: g.why ?? null,
              areaId: g.area_id,
              area: {
                id: a.id,
                name: a.name,
                emoji: a.emoji,
                color: a.color,
                why: a.why,
                sortOrder: a.sort_order,
              },
            }
          }
        }
      } else if (input.area_id && cachedAreas) {
        const a = cachedAreas.find((area) => area.id === input.area_id)
        if (a) {
          optimisticDirectArea = {
            id: a.id,
            name: a.name,
            emoji: a.emoji,
            color: a.color,
            why: a.why,
            sortOrder: a.sort_order,
          }
        }
      }

      // Update tasks.home(*) + tasks.homeWeek(*) caches
      const previousHome = queryClient.getQueriesData({ queryKey: ['tasks', 'home'] })
      const repeatType = input.repeat_type ?? 'once'

      const optimisticHomeTask: ActionHomeTask = {
        id: tempTask.id,
        name: tempTask.name,
        why: tempTask.why,
        goalId: input.goal_id ?? null,
        groupId: input.group_id ?? null,
        areaId: input.area_id ?? null,
        timeSlot: input.time_slot ?? 'anytime',
        specificTime: input.specific_time ?? null,
        durationMinutes: input.duration_minutes ?? 15,
        streakCount: 0,
        bestStreak: 0,
        sortOrder: 'zzz',
        totalCompleted: 0,
        repeatType: repeatType,
        repeatDays: input.repeat_days ?? null,
        scheduledDate: input.scheduled_date ?? null,
        startDate: input.start_date ?? null,
        endDate: input.end_date ?? null,
        taskStatus: 'active',
        directionVersion: null,
        goal: optimisticGoal,
        group: null,
        directArea: optimisticDirectArea,
        relatedAreaIds: input.related_area_ids ?? null,
        relatedAreas: null,
        relatedGoalIds: input.related_goal_ids ?? null,
        relatedGoals: null,
        todayCheckIn: null,
      }

      for (const [key, data] of previousHome) {
        if (!data) continue
        if (Array.isArray(data)) {
          // Daily cache: ['tasks', 'home', dateStr] → ActionHomeTask[]
          const cacheDate = key[2] as string | undefined
          if (
            cacheDate &&
            !shouldInsertOnDate(repeatType, input.repeat_days, input.scheduled_date, cacheDate)
          )
            continue
          queryClient.setQueryData<ActionHomeTask[]>(key, [
            ...(data as ActionHomeTask[]),
            optimisticHomeTask,
          ])
        } else if (typeof data === 'object') {
          // Week cache: ['tasks', 'home', 'week', weekStart] → Record<string, ActionHomeTask[]>
          const weekData = data as Record<string, ActionHomeTask[]>
          const updated: Record<string, ActionHomeTask[]> = {}
          for (const [dateKey, tasks] of Object.entries(weekData)) {
            if (shouldInsertOnDate(repeatType, input.repeat_days, input.scheduled_date, dateKey)) {
              updated[dateKey] = [...(Array.isArray(tasks) ? tasks : []), optimisticHomeTask]
            } else {
              updated[dateKey] = tasks
            }
          }
          queryClient.setQueryData(key, updated)
        }
      }

      return { previousTasks, previousGoals, previousHome }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previousTasks)
      }
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }
      if (context?.previousHome) {
        for (const [key, data] of context.previousHome) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error('할 일 추가에 실패했습니다.')
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'home'] })
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

      if (input.repeat_type === 'once' && input.scheduled_date) {
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        if (input.scheduled_date !== todayStr) {
          const targetDate = parseISO(input.scheduled_date)
          const dateLabel = format(targetDate, 'M월 d일')
          toast.success(`${dateLabel}에 할 일이 추가되었어요`, {
            action: {
              label: `${dateLabel} 보기`,
              onClick: () => usePanelDateStore.getState().setSelectedDate(targetDate),
            },
          })
          return
        }
      }
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
      await queryClient.cancelQueries({ queryKey: ['tasks', 'home'] })

      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks.all)
      const previousGoals = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)
      const previousHome = queryClient.getQueriesData({ queryKey: ['tasks', 'home'] })

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

      // Optimistic Update — tasks.home(*) + tasks.homeWeek(*) caches
      // Home cache stores ActionHomeTask (camelCase), so convert snake_case input
      const snakeToCamel: Record<string, string> = {
        name: 'name',
        why: 'why',
        group_id: 'groupId',
        repeat_type: 'repeatType',
        repeat_days: 'repeatDays',
        duration_minutes: 'durationMinutes',
        time_slot: 'timeSlot',
        specific_time: 'specificTime',
        scheduled_date: 'scheduledDate',
        start_date: 'startDate',
        end_date: 'endDate',
        sort_order: 'sortOrder',
        status: 'taskStatus',
        related_area_ids: 'relatedAreaIds',
        related_goal_ids: 'relatedGoalIds',
      }
      const homePatch: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(input)) {
        const camelKey = snakeToCamel[k]
        if (camelKey !== undefined) {
          homePatch[camelKey] = v
        }
      }

      for (const [key, data] of previousHome) {
        if (!data) continue
        if (Array.isArray(data)) {
          // Daily cache: HomeTask[]
          queryClient.setQueryData<HomeTask[]>(
            key,
            (data as HomeTask[]).map((t) => (t.id === id ? { ...t, ...homePatch } : t))
          )
        } else if (typeof data === 'object') {
          // Week cache: Record<string, HomeTask[]>
          const weekData = data as Record<string, HomeTask[]>
          const updated: Record<string, HomeTask[]> = {}
          for (const [dateKey, tasks] of Object.entries(weekData)) {
            updated[dateKey] = Array.isArray(tasks)
              ? tasks.map((t) => (t.id === id ? { ...t, ...homePatch } : t))
              : tasks
          }
          queryClient.setQueryData(key, updated)
        }
      }

      return { previous, previousGoals, previousHome }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previous)
      }
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }
      if (context?.previousHome) {
        for (const [key, data] of context.previousHome) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error('수정에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'home'] })
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
      await queryClient.cancelQueries({ queryKey: ['tasks', 'home'] })
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks.all)
      const previousHome = queryClient.getQueriesData({ queryKey: ['tasks', 'home'] })

      // Optimistic Delete — tasks.all
      if (previous) {
        queryClient.setQueryData<Task[]>(
          queryKeys.tasks.all,
          previous.filter((task) => task.id !== id)
        )
      }

      // Optimistic Delete — tasks.home(*) + tasks.home.week(*) caches
      for (const [key, data] of previousHome) {
        if (!data) continue
        if (Array.isArray(data)) {
          // Daily: HomeTask[]
          queryClient.setQueryData(
            key,
            (data as HomeTask[]).filter((t) => t.id !== id)
          )
        } else if (typeof data === 'object') {
          // Weekly: Record<string, HomeTask[]>
          const weekData = data as Record<string, HomeTask[]>
          const updated: Record<string, HomeTask[]> = {}
          for (const [dateKey, tasks] of Object.entries(weekData)) {
            updated[dateKey] = Array.isArray(tasks) ? tasks.filter((t) => t.id !== id) : tasks
          }
          queryClient.setQueryData(key, updated)
        }
      }

      return { previous, previousHome }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previous)
      }
      if (context?.previousHome) {
        for (const [key, data] of context.previousHome) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error('삭제에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'home'] })
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
