import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { unwrapResponse } from '@/lib/api'
import {
  createCheckIn as createCheckInAction,
  undoCheckIn as undoCheckInAction,
} from '@/actions/checkin.actions'
import { isStreakMilestone } from '@/lib/constants/animations'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { CreateCheckInInput, CheckInResult, HomeTask } from '@/types/entities'

/**
 * Apply check-in patch to a task. Handles both snake_case (EntityHomeTask) and
 * camelCase (ActionHomeTask) field names since home caches may contain either format.
 */
function patchTaskCheckIn(
  task: HomeTask,
  taskId: string,
  status: string,
  note?: string | null
): HomeTask {
  if (task.id !== taskId) return task

  const record = task as unknown as Record<string, unknown>
  const patched: Record<string, unknown> = {
    ...record,
    todayCheckIn: {
      id: 'optimistic',
      status,
      note: note ?? null,
      createdAt: new Date().toISOString(),
    },
  }

  // Streak: handle both field naming conventions
  if ('streak_count' in record) {
    patched.streak_count =
      status === 'done' ? (record.streak_count as number) + 1 : record.streak_count
  }
  if ('streakCount' in record) {
    patched.streakCount =
      status === 'done' ? (record.streakCount as number) + 1 : record.streakCount
  }

  // Once-type task completion: handle both field naming conventions
  const repeatType = (record.repeat_type ?? record.repeatType) as string | undefined
  if (repeatType === 'once' && status === 'done') {
    if ('status' in record) patched.status = 'completed'
    if ('taskStatus' in record) patched.taskStatus = 'completed'
  }

  return patched as unknown as HomeTask
}

/** Apply undo check-in patch to a task. Handles both field naming conventions. */
function patchTaskUndo(task: HomeTask, taskId: string): HomeTask {
  if (task.id !== taskId) return task

  const record = task as unknown as Record<string, unknown>
  const patched: Record<string, unknown> = {
    ...record,
    todayCheckIn: null,
  }

  if ('streak_count' in record) {
    patched.streak_count = Math.max(0, (record.streak_count as number) - 1)
  }
  if ('streakCount' in record) {
    patched.streakCount = Math.max(0, (record.streakCount as number) - 1)
  }

  const repeatType = (record.repeat_type ?? record.repeatType) as string | undefined
  if (repeatType === 'once') {
    if ('status' in record) patched.status = 'active'
    if ('taskStatus' in record) patched.taskStatus = 'active'
  }

  return patched as unknown as HomeTask
}

/** Replace optimistic check-in ID with real ID in a task. */
function patchTaskOptimisticId(task: HomeTask, taskId: string, realId: string): HomeTask {
  if (task.id !== taskId || task.todayCheckIn?.id !== 'optimistic') return task
  return { ...task, todayCheckIn: { ...task.todayCheckIn, id: realId } }
}

export function useCheckIn(): UseMutationResult<CheckInResult, Error, CreateCheckInInput> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCheckInInput) =>
      createCheckInAction(input.task_id, input.status, input.date, input.note).then(unwrapResponse),

    onMutate: async (newCheckIn) => {
      // Cancel all home caches (daily + weekly)
      await queryClient.cancelQueries({ queryKey: ['tasks', 'home'] })

      // Snapshot ALL home caches for rollback
      const previousHome = queryClient.getQueriesData({ queryKey: ['tasks', 'home'] })

      // Optimistically update both daily and weekly caches (only for the target date)
      for (const [key, data] of previousHome) {
        if (!data) continue
        if (Array.isArray(data)) {
          // Daily cache: ['tasks', 'home', dateStr] — only patch the matching date
          const cacheDate = key[2] as string | undefined
          if (cacheDate !== newCheckIn.date) continue
          queryClient.setQueryData(
            key,
            (data as HomeTask[]).map((task) =>
              patchTaskCheckIn(task, newCheckIn.task_id, newCheckIn.status, newCheckIn.note)
            )
          )
        } else if (typeof data === 'object') {
          // Weekly cache: Record<string, HomeTask[]> — only patch the target date's entry
          const weekData = data as Record<string, HomeTask[]>
          const targetTasks = weekData[newCheckIn.date]
          if (!targetTasks || !Array.isArray(targetTasks)) continue
          queryClient.setQueryData(key, {
            ...weekData,
            [newCheckIn.date]: targetTasks.map((task) =>
              patchTaskCheckIn(task, newCheckIn.task_id, newCheckIn.status, newCheckIn.note)
            ),
          })
        }
      }

      return { previousHome }
    },

    onError: (_err, _variables, context) => {
      // Rollback all home caches
      if (context?.previousHome) {
        for (const [key, data] of context.previousHome) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error('기록에 실패했어요. 다시 시도해주세요.')
    },

    onSuccess: (data, variables) => {
      // Replace optimistic id with real checkinId (only for the target date)
      const allHome = queryClient.getQueriesData({ queryKey: ['tasks', 'home'] })
      for (const [key, cacheData] of allHome) {
        if (!cacheData) continue
        if (Array.isArray(cacheData)) {
          const cacheDate = key[2] as string | undefined
          if (cacheDate !== variables.date) continue
          queryClient.setQueryData(
            key,
            (cacheData as HomeTask[]).map((task) =>
              patchTaskOptimisticId(task, variables.task_id, data.checkinId)
            )
          )
        } else if (typeof cacheData === 'object') {
          const weekData = cacheData as Record<string, HomeTask[]>
          const targetTasks = weekData[variables.date]
          if (!targetTasks || !Array.isArray(targetTasks)) continue
          queryClient.setQueryData(key, {
            ...weekData,
            [variables.date]: targetTasks.map((task) =>
              patchTaskOptimisticId(task, variables.task_id, data.checkinId)
            ),
          })
        }
      }

      // Track analytics event
      trackEvent(
        variables.status === 'done' ? ANALYTICS_EVENTS.CHECKIN_DONE : ANALYTICS_EVENTS.CHECKIN_SKIP,
        { task_id: variables.task_id, date: variables.date, streak: data.newStreak }
      )

      // Milestone celebration toast (streak 5, 10, 15...)
      if (variables.status === 'done' && data.newStreak && isStreakMilestone(data.newStreak)) {
        toast.success(`🔥 ${data.newStreak}일 연속 달성!`, {
          duration: 5000,
        })
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home })
      // Prefix match invalidates both daily and weekly caches
      queryClient.invalidateQueries({ queryKey: ['tasks', 'home'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}

export function useUndoCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ checkInId }: { checkInId: string; taskId: string; date: string }) =>
      undoCheckInAction(checkInId).then(unwrapResponse),

    onMutate: async ({ taskId, date }) => {
      // Cancel all home caches (daily + weekly)
      await queryClient.cancelQueries({ queryKey: ['tasks', 'home'] })

      // Snapshot ALL home caches for rollback
      const previousHome = queryClient.getQueriesData({ queryKey: ['tasks', 'home'] })

      // Optimistically undo check-in (only for the target date)
      for (const [key, data] of previousHome) {
        if (!data) continue
        if (Array.isArray(data)) {
          const cacheDate = key[2] as string | undefined
          if (cacheDate !== date) continue
          queryClient.setQueryData(
            key,
            (data as HomeTask[]).map((task) => patchTaskUndo(task, taskId))
          )
        } else if (typeof data === 'object') {
          const weekData = data as Record<string, HomeTask[]>
          const targetTasks = weekData[date]
          if (!targetTasks || !Array.isArray(targetTasks)) continue
          queryClient.setQueryData(key, {
            ...weekData,
            [date]: targetTasks.map((task) => patchTaskUndo(task, taskId)),
          })
        }
      }

      return { previousHome }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousHome) {
        for (const [key, data] of context.previousHome) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error('취소에 실패했어요.')
    },

    onSuccess: (_data, { taskId }) => {
      trackEvent(ANALYTICS_EVENTS.CHECKIN_UNDO, { task_id: taskId })
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'home'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}
