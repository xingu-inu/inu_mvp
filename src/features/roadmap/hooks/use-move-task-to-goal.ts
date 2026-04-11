import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { moveNode } from '@/actions/tree.actions'
import { getInitialOrder } from '@/lib/fractional-index'
import { queryKeys } from '@/lib/query/keys'
import type { Goal, Task } from '@/types/entities'

interface MoveTaskToGoalInput {
  taskId: string
  targetGoalId: string
  targetGroupId?: string | null
}

/**
 * Task를 다른 Goal로 이동하는 mutation hook
 * - moveNode server action 호출 (group_id 자동 해제)
 * - goals.all 캐시 optimistic update (source goal에서 제거, target goal에 추가)
 */
export function useMoveTaskToGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, targetGoalId, targetGroupId }: MoveTaskToGoalInput) => {
      // Compute newOrder: after last task in target goal
      const goals = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)
      const targetGoal = goals?.find((g) => g.id === targetGoalId)
      const targetTasks = [...(targetGoal?.tasks ?? [])].sort((a, b) =>
        a.sort_order.localeCompare(b.sort_order)
      )
      const newOrder = getInitialOrder(targetTasks)

      const result = await moveNode({
        nodeId: taskId,
        nodeType: 'task',
        newOrder,
        newParentId: targetGoalId,
        targetGroupId: targetGroupId ?? null,
      })

      if (!result.success) {
        const msg =
          'error' in result && typeof result.error === 'string'
            ? result.error
            : '이동에 실패했습니다.'
        throw new Error(msg)
      }

      return result
    },
    onMutate: async ({ taskId, targetGoalId, targetGroupId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })
      await queryClient.cancelQueries({ queryKey: ['tasks', 'home'] })

      const previousGoals = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks.all)

      if (previousGoals) {
        // Find the task to move from source goal
        let movingTask: Task | undefined
        for (const goal of previousGoals) {
          const found = (goal.tasks ?? []).find((t) => t.id === taskId)
          if (found) {
            movingTask = found
            break
          }
        }

        if (movingTask) {
          // Compute new sort order for target goal
          const targetGoal = previousGoals.find((g) => g.id === targetGoalId)
          const targetTasks = [...(targetGoal?.tasks ?? [])].sort((a, b) =>
            a.sort_order.localeCompare(b.sort_order)
          )
          const newOrder = getInitialOrder(targetTasks)

          const movedTask: Task = {
            ...movingTask,
            goal_id: targetGoalId,
            group_id: targetGroupId ?? null,
            sort_order: newOrder,
            updated_at: new Date().toISOString(),
          }

          queryClient.setQueryData<Goal[]>(
            queryKeys.goals.all,
            previousGoals.map((g) => {
              // Remove task from source goal
              if ((g.tasks ?? []).some((t) => t.id === taskId)) {
                return { ...g, tasks: (g.tasks ?? []).filter((t) => t.id !== taskId) }
              }
              // Add task to target goal
              if (g.id === targetGoalId) {
                return { ...g, tasks: [...(g.tasks ?? []), movedTask] }
              }
              return g
            })
          )
        }
      }

      // Update tasks.all cache
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(
          queryKeys.tasks.all,
          previousTasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  goal_id: targetGoalId,
                  group_id: targetGroupId ?? null,
                  updated_at: new Date().toISOString(),
                }
              : t
          )
        )
      }

      return { previousGoals, previousTasks }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.all, context.previousTasks)
      }
      toast.error('이동에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'home'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
    },
  })
}
