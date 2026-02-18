'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { unwrapResponse } from '@/lib/api'
import { getAdminFeedbacks, updateFeedbackStatus } from '@/actions/feedback.actions'
import type { Feedback, FeedbackStatus } from '@/repositories/feedback.repository'

/**
 * 전체 피드백 목록 조회 (관리자용)
 */
export function useAdminFeedbacks(params: { status?: FeedbackStatus; page?: number }) {
  return useQuery<Feedback[]>({
    queryKey: queryKeys.admin.feedbacks({ status: params.status, page: params.page }),
    queryFn: async () => {
      const res = await getAdminFeedbacks(params)
      if (!res.success) throw new Error(res.error.message)
      return res.data
    },
    staleTime: STALE_TIMES.ADMIN_STATS,
  })
}

/**
 * 피드백 상태 업데이트 (관리자용)
 */
export function useUpdateFeedbackStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: { status: FeedbackStatus; admin_note?: string }
    }) => {
      const res = await updateFeedbackStatus(id, input)
      return unwrapResponse(res)
    },
    onSuccess: () => {
      toast.success('피드백 상태가 업데이트되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedbacks'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats })
    },
    onError: (error: Error) => {
      toast.error(error.message || '피드백 상태 변경에 실패했습니다.')
    },
  })
}
