import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getAreas as getAreasAction,
  getActiveAreas as getActiveAreasAction,
  createArea as createAreaAction,
  updateArea as updateAreaAction,
  deleteArea as deleteAreaAction,
} from '@/actions/area.actions'
import type { Area, Goal, CreateAreaInput, UpdateAreaInput } from '@/types/entities'

/**
 * 전체 Area 조회 wrapper
 */
async function fetchAreas(): Promise<Area[]> {
  const response = await getAreasAction()
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * 활성 Area 조회 wrapper
 */
async function fetchActiveAreas(): Promise<Area[]> {
  const response = await getActiveAreasAction()
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * 전체 Area 조회 hook
 */
export function useAreas() {
  return useQuery({
    queryKey: queryKeys.areas.all,
    queryFn: fetchAreas,
    staleTime: STALE_TIMES.AREA,
  })
}

/**
 * 활성 Area 조회 hook
 */
export function useActiveAreas() {
  return useQuery({
    queryKey: queryKeys.areas.active(),
    queryFn: fetchActiveAreas,
    staleTime: STALE_TIMES.AREA,
  })
}

/**
 * Area 생성 hook (Optimistic Insert)
 */
export function useCreateArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ _tempId, ...input }: CreateAreaInput) => {
      const response = await createAreaAction(input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.areas.all })
      const previous = queryClient.getQueryData<Area[]>(queryKeys.areas.all)

      const now = new Date().toISOString()
      const tempArea: Area = {
        id: input._tempId ?? crypto.randomUUID(),
        user_id: '',
        direction_id: '',
        name: input.name,
        type: input.type ?? 'custom',
        emoji: input.emoji,
        color: input.color,
        why: input.why ?? null,
        sort_order: 'zzz',
        is_active: true,
        created_at: now,
        updated_at: now,
      }

      if (previous) {
        queryClient.setQueryData<Area[]>(queryKeys.areas.all, [...previous, tempArea])
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.areas.all, context.previous)
      }
      toast.error('영역 추가에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
    },
    onSuccess: () => {
      toast.success('영역이 추가되었습니다.')
    },
  })
}

/**
 * Area 수정 hook (Optimistic Update)
 */
export function useUpdateArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateAreaInput }) => {
      const response = await updateAreaAction(id, input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.areas.all })
      const previous = queryClient.getQueryData<Area[]>(queryKeys.areas.all)

      if (previous) {
        queryClient.setQueryData<Area[]>(
          queryKeys.areas.all,
          previous.map((area) =>
            area.id === id ? { ...area, ...input, updated_at: new Date().toISOString() } : area
          )
        )
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.areas.all, context.previous)
      }
      toast.error('수정에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
    },
    onSuccess: () => {
      toast.success('영역이 수정되었습니다.')
    },
  })
}

/**
 * Area 삭제 hook (Optimistic Delete)
 */
export function useDeleteArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteAreaAction(id)
      if (!response.success) {
        throw new Error(response.error.message)
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.areas.all })
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.all })

      const previousAreas = queryClient.getQueryData<Area[]>(queryKeys.areas.all)
      const previousGoals = queryClient.getQueryData<Goal[]>(queryKeys.goals.all)

      // Remove area
      if (previousAreas) {
        queryClient.setQueryData<Area[]>(
          queryKeys.areas.all,
          previousAreas.filter((area) => area.id !== id)
        )
      }

      // Cascade: remove goals belonging to this area
      if (previousGoals) {
        queryClient.setQueryData<Goal[]>(
          queryKeys.goals.all,
          previousGoals.filter((goal) => goal.area_id !== id)
        )
      }

      return { previousAreas, previousGoals }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousAreas) {
        queryClient.setQueryData(queryKeys.areas.all, context.previousAreas)
      }
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals.all, context.previousGoals)
      }
      toast.error('삭제에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
    },
    onSuccess: () => {
      toast.success('영역이 삭제되었습니다.')
    },
  })
}
