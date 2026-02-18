'use client'

import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCard } from '@/components/ui/error-card'

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>
  loadingFallback?: ReactNode
  errorFallback?: (error: Error) => ReactNode
  emptyFallback?: ReactNode
  children: (data: NonNullable<T>) => ReactNode
}

export function QueryBoundary<T>({
  query,
  loadingFallback,
  errorFallback,
  emptyFallback,
  children,
}: QueryBoundaryProps<T>) {
  if (query.isLoading) {
    return <>{loadingFallback || <Skeleton className="h-20 w-full" />}</>
  }

  if (query.isError) {
    return <>{errorFallback?.(query.error) || <ErrorCard error={query.error} />}</>
  }

  if (query.data == null) {
    return <>{emptyFallback || null}</>
  }

  // Handle empty arrays
  if (Array.isArray(query.data) && query.data.length === 0) {
    return <>{emptyFallback || null}</>
  }

  return <>{children(query.data)}</>
}

// 사용 예시:
// <QueryBoundary
//   query={goalsQuery}
//   loadingFallback={<GoalsSkeleton />}
//   emptyFallback={<EmptyGoals />}
// >
//   {(goals) => <GoalList goals={goals} />}
// </QueryBoundary>
