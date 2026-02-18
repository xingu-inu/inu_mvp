// API Response Helpers
// Phase 4.5: API Design & Server Actions

import type { ApiSuccessResponse, ApiListResponse, ApiErrorResponse } from '@/types/api'
import { ErrorCode, getErrorMessage } from './errors'

/**
 * 성공 응답 생성 (단일 데이터)
 */
export function successResponse<T>(data: T, meta?: Record<string, unknown>): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  }
}

/**
 * 목록 응답 생성 (페이지네이션 포함)
 */
export function listResponse<T>(
  data: T[],
  pagination?: {
    total: number
    page: number
    pageSize: number
  }
): ApiListResponse<T> {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1

  return {
    success: true,
    data,
    pagination: pagination
      ? {
          ...pagination,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1,
        }
      : undefined,
    meta: {
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * 에러 응답 생성
 */
export function errorResponse(
  code: ErrorCode,
  message?: string,
  details?: Partial<ApiErrorResponse['error']>
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message: message ?? getErrorMessage(code),
      ...details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * 유효성 검사 에러 응답 생성
 */
export function validationErrorResponse(
  errors: Array<{ field: string; message: string }>
): ApiErrorResponse {
  return errorResponse(ErrorCode.VALIDATION_ERROR, '입력값을 확인해주세요.', {
    validationErrors: errors,
  })
}

/**
 * 인증 에러 응답 생성
 */
export function authErrorResponse(
  code:
    | ErrorCode.AUTH_REQUIRED
    | ErrorCode.AUTH_EXPIRED
    | ErrorCode.AUTH_FORBIDDEN
    | ErrorCode.AUTH_INVALID_TOKEN = ErrorCode.AUTH_REQUIRED
): ApiErrorResponse {
  return errorResponse(code)
}

/**
 * Not Found 에러 응답 생성
 */
export function notFoundResponse(resource?: string): ApiErrorResponse {
  const message = resource
    ? `${resource}을(를) 찾을 수 없습니다.`
    : getErrorMessage(ErrorCode.NOT_FOUND)
  return errorResponse(ErrorCode.NOT_FOUND, message)
}

/**
 * 내부 서버 에러 응답 생성
 */
export function internalErrorResponse(
  error?: unknown,
  isDev = process.env.NODE_ENV === 'development'
): ApiErrorResponse {
  const details = isDev && error instanceof Error ? error.message : undefined

  return errorResponse(ErrorCode.INTERNAL_ERROR, undefined, {
    details,
  })
}
