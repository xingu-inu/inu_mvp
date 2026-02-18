'use server'

import { adminAction } from '@/lib/security'
import { successResponse, listResponse, errorResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { adminRepository } from '@/repositories'
import type { AdminStats, SignupChartRow, AdminUserRow } from '@/repositories/admin.repository'
import type { ApiResponse, ApiListResult } from '@/types/api'

/**
 * 관리자 대시보드 통계
 */
export const getAdminStats = adminAction(
  'getAdminStats',
  async ({ supabase }): Promise<ApiResponse<AdminStats>> => {
    const stats = await adminRepository.getStats(supabase)
    return successResponse(stats)
  }
)

/**
 * 가입자 차트 데이터
 */
export const getAdminSignupChart = adminAction(
  'getAdminSignupChart',
  async ({ supabase }, days: number = 30): Promise<ApiResponse<SignupChartRow[]>> => {
    const chart = await adminRepository.getSignupChart(supabase, days)
    return successResponse(chart)
  }
)

/**
 * 사용자 목록 조회 (관리자용)
 */
export const getAdminUsers = adminAction(
  'getAdminUsers',
  async (
    { supabase },
    params: { search?: string; page?: number; pageSize?: number }
  ): Promise<ApiListResult<AdminUserRow>> => {
    const safePage = Math.max(1, Math.floor(params.page ?? 1))
    const safePageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize ?? 20)))
    const { users, total } = await adminRepository.listUsers(supabase, {
      ...params,
      page: safePage,
      pageSize: safePageSize,
    })
    return listResponse(users, {
      total,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    })
  }
)

/**
 * 사용자 상세 조회 (관리자용)
 */
export const getAdminUserDetail = adminAction(
  'getAdminUserDetail',
  async ({ supabase }, userId: string): Promise<ApiResponse<AdminUserRow | null>> => {
    const user = await adminRepository.getUserDetail(supabase, userId)
    return successResponse(user)
  }
)

/**
 * 관리자 권한 토글 (자기 자신은 해제 불가)
 */
export const toggleAdminStatus = adminAction(
  'toggleAdminStatus',
  async ({ supabase, user }, userId: string, isAdmin: boolean): Promise<ApiResponse<void>> => {
    // 자기 자신의 관리자 권한 해제 방지
    if (user.id === userId && !isAdmin) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, '자신의 관리자 권한은 해제할 수 없습니다.')
    }

    await adminRepository.setAdminStatus(supabase, userId, isAdmin)
    return successResponse(undefined)
  }
)
