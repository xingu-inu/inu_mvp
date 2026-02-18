// API Response Types
// Phase 4.5: API Design & Server Actions

import type { ErrorCode } from '@/lib/api/errors'

/**
 * 성공 응답 (단일 데이터)
 */
export interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: {
    timestamp: string
    requestId?: string
  }
}

/**
 * 목록 응답 (페이지네이션 포함)
 */
export interface ApiListResponse<T> {
  success: true
  data: T[]
  pagination?: {
    total: number
    page: number
    pageSize: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta?: {
    timestamp: string
  }
}

/**
 * 에러 응답
 */
export interface ApiErrorResponse {
  success: false
  error: {
    code: ErrorCode
    message: string // 사용자 친화적 메시지
    details?: string // 개발자용 상세 정보 (dev only)
    field?: string // 유효성 검사 실패 필드
    validationErrors?: Array<{
      field: string
      message: string
    }>
  }
  meta?: {
    timestamp: string
    requestId?: string
  }
}

/**
 * 통합 응답 타입 (단일 데이터)
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * 통합 응답 타입 (목록 데이터)
 */
export type ApiListResult<T> = ApiListResponse<T> | ApiErrorResponse

/**
 * 타입 가드: 성공 응답 확인
 */
export function isApiSuccess<T>(
  response: ApiResponse<T> | ApiListResult<T>
): response is ApiSuccessResponse<T> | ApiListResponse<T> {
  return response.success === true
}

/**
 * 타입 가드: 에러 응답 확인
 */
export function isApiError(
  response: ApiResponse<unknown> | ApiListResult<unknown>
): response is ApiErrorResponse {
  return response.success === false
}
