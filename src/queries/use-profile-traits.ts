import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { generateKeyBetween } from 'fractional-indexing'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getProfileTraits as getProfileTraitsAction,
  createProfileTrait as createProfileTraitAction,
  updateProfileTrait as updateProfileTraitAction,
  deleteProfileTrait as deleteProfileTraitAction,
  reorderProfileTraits as reorderProfileTraitsAction,
} from '@/actions'
import type {
  ProfileTrait,
  CreateProfileTraitInput,
  UpdateProfileTraitInput,
} from '@/types/entities'

async function fetchProfileTraits(): Promise<ProfileTrait[]> {
  const response = await getProfileTraitsAction()
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * 프로필 항목 조회 hook
 */
export function useProfileTraits() {
  return useQuery({
    queryKey: queryKeys.profileTraits.all,
    queryFn: fetchProfileTraits,
    staleTime: STALE_TIMES.PROFILE_TRAITS,
  })
}

/**
 * 프로필 항목 생성 hook (Optimistic Update)
 */
export function useCreateProfileTrait() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProfileTraitInput) => {
      const response = await createProfileTraitAction(input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profileTraits.all })
      const previous = queryClient.getQueryData<ProfileTrait[]>(queryKeys.profileTraits.all)

      const lastSortOrder = previous?.at(-1)?.sort_order ?? null
      const optimisticTrait: ProfileTrait = {
        id: crypto.randomUUID(),
        user_id: '',
        label: input.label,
        value: input.value,
        category: input.category ?? 'general',
        sort_order: generateKeyBetween(lastSortOrder, null),
        history: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueryData<ProfileTrait[]>(queryKeys.profileTraits.all, [
        ...(previous ?? []),
        optimisticTrait,
      ])

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.profileTraits.all, context.previous)
      }
      toast.error('항목 추가에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profileTraits.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
    },
  })
}

/**
 * 프로필 항목 수정 hook (Optimistic Update)
 */
export function useUpdateProfileTrait() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateProfileTraitInput }) => {
      const response = await updateProfileTraitAction(id, input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profileTraits.all })
      const previous = queryClient.getQueryData<ProfileTrait[]>(queryKeys.profileTraits.all)

      if (previous) {
        queryClient.setQueryData<ProfileTrait[]>(
          queryKeys.profileTraits.all,
          previous.map((t) => {
            if (t.id !== id) return t
            const updatedHistory =
              input.value !== undefined && input.value !== t.value
                ? [...t.history, { value: t.value, changed_at: new Date().toISOString() }]
                : t.history
            return { ...t, ...input, history: updatedHistory, updated_at: new Date().toISOString() }
          })
        )
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.profileTraits.all, context.previous)
      }
      toast.error('항목 수정에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profileTraits.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
    },
  })
}

/**
 * 프로필 항목 삭제 hook (Optimistic Update)
 */
export function useDeleteProfileTrait() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteProfileTraitAction(id)
      if (!response.success) {
        throw new Error(response.error.message)
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profileTraits.all })
      const previous = queryClient.getQueryData<ProfileTrait[]>(queryKeys.profileTraits.all)

      if (previous) {
        queryClient.setQueryData<ProfileTrait[]>(
          queryKeys.profileTraits.all,
          previous.filter((t) => t.id !== id)
        )
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.profileTraits.all, context.previous)
      }
      toast.error('항목 삭제에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profileTraits.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
    },
  })
}

/**
 * 프로필 항목 순서 변경 hook (Optimistic Update)
 */
export function useReorderProfileTraits() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const response = await reorderProfileTraitsAction(orderedIds)
      if (!response.success) {
        throw new Error(response.error.message)
      }
    },
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profileTraits.all })
      const previous = queryClient.getQueryData<ProfileTrait[]>(queryKeys.profileTraits.all)

      if (previous) {
        const reordered = orderedIds
          .map((id) => previous.find((t) => t.id === id))
          .filter((t): t is ProfileTrait => t !== undefined)
        queryClient.setQueryData<ProfileTrait[]>(queryKeys.profileTraits.all, reordered)
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.profileTraits.all, context.previous)
      }
      toast.error('순서 변경에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profileTraits.all })
    },
  })
}
