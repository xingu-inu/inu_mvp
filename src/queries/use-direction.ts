import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getDirection as getDirectionAction,
  createDirection as createDirectionAction,
  updateDirection as updateDirectionAction,
} from '@/actions/direction.actions'
import {
  getDirectionHistory,
  getArchivedRoadmap,
  createNewRoadmapVersion,
  deleteArchivedRoadmap,
} from '@/actions/roadmap-version.actions'
import type {
  Direction,
  CreateDirectionInput,
  UpdateDirectionInput,
  DirectionHistoryItem,
  ArchivedRoadmapData,
  CreateRoadmapVersionInput,
  RoadmapVersionResult,
  DeleteArchivedRoadmapResult,
} from '@/types/entities'

/**
 * Direction 조회 wrapper
 */
async function fetchDirection(): Promise<Direction | null> {
  const response = await getDirectionAction()
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * Direction 조회 hook
 */
export function useDirection() {
  return useQuery({
    queryKey: queryKeys.direction.all,
    queryFn: fetchDirection,
    staleTime: STALE_TIMES.DIRECTION,
  })
}

/**
 * Direction 생성 hook (Optimistic Update)
 */
export function useCreateDirection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateDirectionInput) => {
      const response = await createDirectionAction(input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.direction.all })
      const previous = queryClient.getQueryData<Direction | null>(queryKeys.direction.all)

      const now = new Date().toISOString()
      queryClient.setQueryData<Direction | null>(queryKeys.direction.all, {
        id: crypto.randomUUID(),
        user_id: '',
        statement: input.statement,
        why: input.why ?? null,
        status: 'active',
        version: 1,
        name: null,
        archived_at: null,
        created_at: now,
        updated_at: now,
      })

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.direction.all, context.previous ?? null)
      }
      toast.error('방향 설정에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.direction.all })
    },
    onSuccess: () => {
      toast.success('방향이 설정되었습니다.')
    },
  })
}

/**
 * Direction 수정 hook (Optimistic Update)
 */
export function useUpdateDirection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateDirectionInput }) => {
      const response = await updateDirectionAction(id, input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async ({ input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.direction.all })
      const previous = queryClient.getQueryData<Direction | null>(queryKeys.direction.all)

      if (previous) {
        queryClient.setQueryData<Direction | null>(queryKeys.direction.all, {
          ...previous,
          ...input,
          updated_at: new Date().toISOString(),
        })
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.direction.all, context.previous ?? null)
      }
      toast.error('방향 수정에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.direction.all })
    },
    onSuccess: () => {
      toast.success('방향이 수정되었습니다.')
    },
  })
}

/**
 * 로드맵 버전 히스토리 조회
 */
export function useDirectionHistory() {
  return useQuery<DirectionHistoryItem[]>({
    queryKey: queryKeys.direction.history,
    queryFn: async () => {
      const response = await getDirectionHistory()
      if (!response.success) throw new Error(response.error.message)
      return response.data
    },
    staleTime: STALE_TIMES.DIRECTION,
  })
}

/**
 * 아카이브된 로드맵 조회
 */
export function useArchivedRoadmap(directionId: string | null) {
  return useQuery<ArchivedRoadmapData>({
    queryKey: queryKeys.direction.archived(directionId!),
    queryFn: async () => {
      const response = await getArchivedRoadmap(directionId!)
      if (!response.success) throw new Error(response.error.message)
      return response.data
    },
    enabled: !!directionId,
    staleTime: Infinity,
  })
}

/**
 * 새 로드맵 버전 생성 (재정비) mutation
 */
export function useCreateRoadmapVersion() {
  const queryClient = useQueryClient()

  return useMutation<RoadmapVersionResult, Error, CreateRoadmapVersionInput>({
    mutationFn: async (input) => {
      const response = await createNewRoadmapVersion(input)
      if (!response.success) throw new Error(response.error.message)
      return response.data
    },
    onSuccess: () => {
      trackEvent(ANALYTICS_EVENTS.ROADMAP_VERSION_CREATED)
      // 새 로드맵 = 모든 데이터 갱신 필요
      queryClient.invalidateQueries({ queryKey: queryKeys.direction.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.areas.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.direction.history })
    },
  })
}

/**
 * 아카이브된 로드맵 삭제 mutation (Optimistic Update)
 */
export function useDeleteArchivedRoadmap() {
  const queryClient = useQueryClient()

  return useMutation<
    DeleteArchivedRoadmapResult,
    Error,
    string,
    { previous: DirectionHistoryItem[] | undefined }
  >({
    mutationFn: async (directionId) => {
      const response = await deleteArchivedRoadmap(directionId)
      if (!response.success) throw new Error(response.error.message)
      return response.data
    },
    onMutate: async (directionId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.direction.history })

      const previous = queryClient.getQueryData<DirectionHistoryItem[]>(queryKeys.direction.history)

      // Optimistic: 히스토리에서 즉시 제거
      if (previous) {
        queryClient.setQueryData<DirectionHistoryItem[]>(
          queryKeys.direction.history,
          previous.filter((item) => item.id !== directionId)
        )
      }

      // 해당 archived 캐시도 정리
      queryClient.removeQueries({
        queryKey: queryKeys.direction.archived(directionId),
      })

      return { previous }
    },
    onError: (_err, _directionId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.direction.history, context.previous)
      }
      toast.error('삭제에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.direction.history })
    },
    onSuccess: () => {
      toast.success('로드맵 기록이 삭제되었습니다.')
    },
  })
}
