import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  getProfile as getProfileAction,
  updateProfile as updateProfileAction,
  updateAvatar as updateAvatarAction,
} from '@/actions'
import type { Profile, UpdateProfileInput } from '@/types/entities'

/**
 * 프로필 조회 wrapper
 */
async function fetchProfile(): Promise<Profile | null> {
  const response = await getProfileAction()
  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}

/**
 * 프로필 조회 hook
 */
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: fetchProfile,
    staleTime: STALE_TIMES.PROFILE,
  })
}

/**
 * 프로필 수정 hook (Optimistic Update)
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const response = await updateProfileAction(input)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile.me })
      const previous = queryClient.getQueryData<Profile | null>(queryKeys.profile.me)

      if (previous) {
        queryClient.setQueryData<Profile | null>(queryKeys.profile.me, {
          ...previous,
          ...input,
        })
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.profile.me, context.previous)
      }
      toast.error('프로필 수정에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me })
    },
    onSuccess: () => {
      toast.success('프로필이 수정되었습니다.')
    },
  })
}

/**
 * 아바타 수정 hook (Optimistic Update)
 */
export function useUpdateAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await updateAvatarAction(formData)
      if (!response.success) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile.me })
      const previous = queryClient.getQueryData<Profile | null>(queryKeys.profile.me)

      // 로컬 프리뷰 URL 생성
      const file = formData.get('avatar') as File | null
      if (file && previous) {
        const previewUrl = URL.createObjectURL(file)
        queryClient.setQueryData<Profile | null>(queryKeys.profile.me, {
          ...previous,
          avatar_url: previewUrl,
        })
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.profile.me, context.previous)
      }
      toast.error('프로필 사진 변경에 실패했습니다.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me })
    },
    onSuccess: (avatarUrl) => {
      // 서버 URL로 교체
      queryClient.setQueryData(queryKeys.profile.me, (old: Profile | undefined) => {
        if (!old) return old
        return { ...old, avatar_url: avatarUrl }
      })
      toast.success('프로필 사진이 변경되었습니다.')
    },
  })
}
