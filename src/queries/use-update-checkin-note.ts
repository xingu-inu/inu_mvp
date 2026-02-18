import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { unwrapResponse } from '@/lib/api'
import { updateCheckIn as updateCheckInAction } from '@/actions/checkin.actions'
import type { CheckInStatus, HomeTask } from '@/types/entities'

interface UpdateCheckInNoteInput {
  checkInId: string
  taskId: string
  date: string
  status: CheckInStatus
  note: string | undefined
}

export function useUpdateCheckInNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateCheckInNoteInput) =>
      updateCheckInAction(input.checkInId, input.status, input.note).then(unwrapResponse),

    onMutate: async (input) => {
      const dateKey = queryKeys.tasks.home(input.date)
      await queryClient.cancelQueries({ queryKey: dateKey })
      const previousTasks = queryClient.getQueryData<HomeTask[]>(dateKey)

      if (previousTasks) {
        queryClient.setQueryData<HomeTask[]>(dateKey, (prev) =>
          prev?.map((task) =>
            task.id === input.taskId && task.todayCheckIn
              ? {
                  ...task,
                  todayCheckIn: {
                    ...task.todayCheckIn,
                    note: input.note ?? null,
                  },
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
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.home(variables.date),
      })
    },
  })
}
