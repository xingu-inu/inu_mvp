'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { unwrapResponse } from '@/lib/api'
import { submitFeedback, getMyFeedbacks } from '@/actions/feedback.actions'
import type { Feedback } from '@/repositories/feedback.repository'

/**
 * 내 피드백 목록 조회 (사용자용)
 */
export function useMyFeedbacks() {
  return useQuery<Feedback[]>({
    queryKey: queryKeys.feedbacks.mine,
    queryFn: async () => {
      const res = await getMyFeedbacks()
      return unwrapResponse(res)
    },
    staleTime: STALE_TIMES.ANNOUNCEMENTS,
  })
}

/**
 * 피드백 제출 (사용자용)
 */
export function useSubmitFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      category: 'general' | 'bug' | 'feature' | 'improvement'
      content: string
    }) => {
      const res = await submitFeedback(input)
      return unwrapResponse(res)
    },
    onSuccess: () => {
      toast.success('피드백이 제출되었습니다. 감사합니다!')
      queryClient.invalidateQueries({ queryKey: queryKeys.feedbacks.mine })
    },
    onError: (error: Error) => {
      toast.error(error.message || '피드백 제출에 실패했습니다.')
    },
  })
}
