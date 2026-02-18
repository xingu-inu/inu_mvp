import type { ApiResponse, ApiListResult, ApiErrorResponse } from '@/types/api'

/**
 * ApiErrorResponse를 Error로 변환하는 클래스
 * TanStack Query의 isError에서 활용 가능
 */
export class ApiError extends Error {
  code: string
  details?: string

  constructor(response: ApiErrorResponse) {
    super(response.error.message)
    this.name = 'ApiError'
    this.code = response.error.code
    this.details = response.error.details
  }
}

/**
 * ApiResponse<T>를 unwrap: success면 data 반환, 실패면 throw
 * TanStack Query queryFn/mutationFn에서 사용:
 * queryFn: () => someAction().then(unwrapResponse)
 */
export function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new ApiError(response)
  }
  return response.data
}

/**
 * ApiListResult<T>를 unwrap: success면 data[] 반환, 실패면 throw
 * queryFn: () => someListAction().then(unwrapListResponse)
 */
export function unwrapListResponse<T>(response: ApiListResult<T>): T[] {
  if (!response.success) {
    throw new ApiError(response)
  }
  return response.data
}
