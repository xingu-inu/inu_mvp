import { QueryClient, type QueryClientConfig } from '@tanstack/react-query'
import { STALE_TIMES } from './stale-times'

/**
 * 에러 타입 판별 함수
 */
function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('JWT') ||
      error.message.includes('auth') ||
      error.message.includes('401')
    )
  }
  return false
}

function isValidationError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('validation') || error.message.includes('invalid')
  }
  return false
}

/**
 * QueryClient 설정
 */
export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // 기본 stale time (1분)
      staleTime: STALE_TIMES.TASK,

      // Garbage collection time (30분)
      gcTime: 30 * 60 * 1000,

      // 재시도 전략
      retry: (failureCount, error) => {
        // 인증 에러는 재시도 안 함
        if (isAuthError(error)) return false
        // 유효성 에러는 재시도 안 함
        if (isValidationError(error)) return false
        // 네트워크/서버 에러는 2회 재시도
        return failureCount < 2
      },

      // 지수 백오프 (1초, 2초, 4초... 최대 10초)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

      // 윈도우 포커스 시 refetch (staleTime 지난 경우만)
      refetchOnWindowFocus: true,

      // 네트워크 재연결 시 refetch
      refetchOnReconnect: true,
    },
    mutations: {
      // Mutation은 재시도 안 함 (Optimistic Update 충돌 방지)
      retry: false,
    },
  },
}

/**
 * QueryClient 인스턴스 생성
 */
export function createQueryClient(): QueryClient {
  return new QueryClient(queryClientConfig)
}
