'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { unwrapResponse } from '@/lib/api'
import { getAdminUsers, getAdminUserDetail, toggleAdminStatus } from '@/actions/admin.actions'
import type { AdminUserRow } from '@/repositories/admin.repository'

/**
 * 사용자 목록 조회 (관리자용)
 */
export function useAdminUsers(params: { search?: string; page?: number }) {
  return useQuery<AdminUserRow[]>({
    queryKey: queryKeys.admin.users(params),
    queryFn: async () => {
      const res = await getAdminUsers(params)
      if (!res.success) throw new Error(res.error.message)
      return res.data
    },
    staleTime: STALE_TIMES.ADMIN_USERS,
  })
}

/**
 * 사용자 상세 조회 (관리자용)
 */
export function useAdminUserDetail(userId: string) {
  return useQuery<AdminUserRow | null>({
    queryKey: queryKeys.admin.userDetail(userId),
    queryFn: async () => {
      const res = await getAdminUserDetail(userId)
      return unwrapResponse(res)
    },
    enabled: !!userId,
    staleTime: STALE_TIMES.ADMIN_USERS,
  })
}

/**
 * 관리자 권한 토글
 */
export function useToggleAdminStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const res = await toggleAdminStatus(userId, isAdmin)
      return unwrapResponse(res)
    },
    onSuccess: (_data, { isAdmin }) => {
      toast.success(isAdmin ? '관리자 권한을 부여했습니다.' : '관리자 권한을 해제했습니다.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '권한 변경에 실패했습니다.')
    },
  })
}
