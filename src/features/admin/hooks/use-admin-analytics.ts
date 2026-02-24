'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { unwrapResponse } from '@/lib/api'
import {
  getAdminEngagementStats,
  getAdminOnboardingFunnel,
  getAdminRetentionCohorts,
  getAdminFeatureAdoption,
  getAdminStreakDistribution,
} from '@/actions/admin.actions'
import type {
  EngagementStats,
  OnboardingFunnel,
  RetentionCohort,
  FeatureAdoption,
  StreakBucket,
} from '@/repositories/admin.repository'

/**
 * 참여도(DAU/WAU/MAU) 시계열 + 요약 조회
 */
export function useAdminEngagement(days: number = 30) {
  return useQuery<EngagementStats>({
    queryKey: queryKeys.admin.engagement(days),
    queryFn: async () => {
      const res = await getAdminEngagementStats(days)
      return unwrapResponse(res)
    },
    staleTime: STALE_TIMES.ADMIN_ANALYTICS,
  })
}

/**
 * 온보딩 퍼널 조회
 */
export function useAdminOnboardingFunnel() {
  return useQuery<OnboardingFunnel>({
    queryKey: queryKeys.admin.funnel,
    queryFn: async () => {
      const res = await getAdminOnboardingFunnel()
      return unwrapResponse(res)
    },
    staleTime: STALE_TIMES.ADMIN_ANALYTICS,
  })
}

/**
 * 리텐션 코호트 조회
 */
export function useAdminRetentionCohorts(cohortCount: number = 8) {
  return useQuery<RetentionCohort[]>({
    queryKey: queryKeys.admin.retention(cohortCount),
    queryFn: async () => {
      const res = await getAdminRetentionCohorts(cohortCount)
      return unwrapResponse(res)
    },
    staleTime: STALE_TIMES.ADMIN_ANALYTICS,
  })
}

/**
 * 기능 사용률 조회
 */
export function useAdminFeatureAdoption() {
  return useQuery<FeatureAdoption>({
    queryKey: queryKeys.admin.featureAdoption,
    queryFn: async () => {
      const res = await getAdminFeatureAdoption()
      return unwrapResponse(res)
    },
    staleTime: STALE_TIMES.ADMIN_ANALYTICS,
  })
}

/**
 * 스트릭 분포 조회
 */
export function useAdminStreakDistribution() {
  return useQuery<StreakBucket[]>({
    queryKey: queryKeys.admin.streakDistribution,
    queryFn: async () => {
      const res = await getAdminStreakDistribution()
      return unwrapResponse(res)
    },
    staleTime: STALE_TIMES.ADMIN_ANALYTICS,
  })
}
