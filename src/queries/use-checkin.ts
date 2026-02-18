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

export function useCheckIn(): UseMutationResult<CheckInResult, Error, CreateCheckInInput> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCheckInInput) =>
      createCheckInAction(input.task_id, input.status, input.date, input.note).then(unwrapResponse),

    onMutate: async (newCheckIn) => {
      const dateKey = queryKeys.tasks.home(newCheckIn.date)

      // Cancel outgoing refetches for the target date
      await queryClient.cancelQueries({ queryKey: dateKey })

      // Snapshot previous value from date-specific cache
      const previousTasks = queryClient.getQueryData<HomeTask[]>(dateKey)

      // Optimistically update the date-specific tasks cache
      if (previousTasks) {
        queryClient.setQueryData<HomeTask[]>(dateKey, (prev) =>
          prev
            ? prev.map((task) =>
                task.id === newCheckIn.task_id
                  ? {
                      ...task,
                      todayCheckIn: {
                        id: 'optimistic',
                        status: newCheckIn.status,
                        note: newCheckIn.note ?? null,
                        createdAt: new Date().toISOString(),
                      },
                      streak_count:
                        newCheckIn.status === 'done' ? task.streak_count + 1 : task.streak_count,
                      ...(task.repeat_type === 'once' && newCheckIn.status === 'done'
                        ? { taskStatus: 'completed' as const, status: 'completed' as const }
                        : {}),
                    }
                  : task
              )
            : prev
        )
      }

      return { previousTasks, dateKey }
    },

    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousTasks && context.dateKey) {
        queryClient.setQueryData(context.dateKey, context.previousTasks)
      }
      toast.error('기록에 실패했어요. 다시 시도해주세요.')
    },

    onSuccess: (data, variables) => {
      // Replace optimistic id with real checkinId so undo is immediately available
      const dateKey = queryKeys.tasks.home(variables.date)
      queryClient.setQueryData<HomeTask[]>(dateKey, (prev) =>
        prev?.map((task) =>
          task.id === variables.task_id && task.todayCheckIn?.id === 'optimistic'
            ? { ...task, todayCheckIn: { ...task.todayCheckIn, id: data.checkinId } }
            : task
        )
      )

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

    onSettled: (_data, _error, variables) => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home })
      // Invalidate the date-specific tasks cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.home(variables.date),
      })
      // Sync roadmap tree (goals include nested task data)
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
      const dateKey = queryKeys.tasks.home(date)
      await queryClient.cancelQueries({ queryKey: dateKey })
      const previousTasks = queryClient.getQueryData<HomeTask[]>(dateKey)

      if (previousTasks) {
        queryClient.setQueryData<HomeTask[]>(dateKey, (prev) =>
          prev?.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  todayCheckIn: null,
                  streak_count: Math.max(0, task.streak_count - 1),
                  ...(task.repeat_type === 'once'
                    ? { taskStatus: 'active' as const, status: 'active' as const }
                    : {}),
                }
              : task
          )
        )
      }

      return { previousTasks, dateKey }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousTasks && context.dateKey) {
        queryClient.setQueryData(context.dateKey, context.previousTasks)
      }
      toast.error('취소에 실패했어요.')
    },

    onSuccess: (_data, { taskId }) => {
      trackEvent(ANALYTICS_EVENTS.CHECKIN_UNDO, { task_id: taskId })
    },

    onSettled: (_data, _error, { date }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.home(date) })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })
}
