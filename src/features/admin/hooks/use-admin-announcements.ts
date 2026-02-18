'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { unwrapResponse } from '@/lib/api'
import {
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '@/actions/announcement.actions'
import type { Announcement } from '@/repositories/announcement.repository'

/**
 * 전체 공지사항 목록 조회 (관리자용)
 */
export function useAdminAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: queryKeys.admin.announcements,
    queryFn: async () => {
      const res = await getAdminAnnouncements()
      if (!res.success) throw new Error(res.error.message)
      return res.data
    },
    staleTime: STALE_TIMES.ADMIN_STATS,
  })
}

/**
 * 공지사항 생성 (관리자용)
 */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      title: string
      content: string
      type: 'info' | 'update' | 'event'
      expires_at?: string | null
    }) => {
      const res = await createAnnouncement(input)
      return unwrapResponse(res)
    },
    onSuccess: () => {
      toast.success('공지사항이 등록되었습니다.')
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.announcements })
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.active })
    },
    onError: (error: Error) => {
      toast.error(error.message || '공지사항 등록에 실패했습니다.')
    },
  })
}

/**
 * 공지사항 수정 (관리자용)
 */
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: {
        title?: string
        content?: string
        type?: 'info' | 'update' | 'event'
        is_active?: boolean
        expires_at?: string | null
      }
    }) => {
      const res = await updateAnnouncement(id, input)
      return unwrapResponse(res)
    },
    onSuccess: () => {
      toast.success('공지사항이 수정되었습니다.')
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.announcements })
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.active })
    },
    onError: (error: Error) => {
      toast.error(error.message || '공지사항 수정에 실패했습니다.')
    },
  })
}

/**
 * 공지사항 삭제 (관리자용)
 */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteAnnouncement(id)
      return unwrapResponse(res)
    },
    onSuccess: () => {
      toast.success('공지사항이 삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.announcements })
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.active })
    },
    onError: (error: Error) => {
      toast.error(error.message || '공지사항 삭제에 실패했습니다.')
    },
  })
}
