'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { unwrapResponse } from '@/lib/api'
import { getAdminStats, getAdminSignupChart } from '@/actions/admin.actions'
import type { AdminStats, SignupChartRow } from '@/repositories/admin.repository'

/**
 * 관리자 대시보드 통계 조회
 */
export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: queryKeys.admin.stats,
    queryFn: async () => {
      const res = await getAdminStats()
      return unwrapResponse(res)
    },
    staleTime: STALE_TIMES.ADMIN_STATS,
  })
}

/**
 * 가입자 차트 데이터 조회
 */
export function useAdminSignupChart(days: number = 30) {
  return useQuery<SignupChartRow[]>({
    queryKey: queryKeys.admin.signupChart(days),
    queryFn: async () => {
      const res = await getAdminSignupChart(days)
      return unwrapResponse(res)
    },
    staleTime: STALE_TIMES.ADMIN_STATS,
  })
}
