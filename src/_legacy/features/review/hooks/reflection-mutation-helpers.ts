import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shared optimistic-update helpers for reflection mutations
// Used by useWeeklyReflection and useMonthlyReflection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Builds the onMutate handler for a reflection mutation.
 * Cancels in-flight queries, snapshots previous data, and applies
 * an optimistic update to the cache.
 */
export function buildReflectionOnMutate<TData extends object, TInput extends Partial<TData>>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  buildOptimistic: (input: TInput) => TData
) {
  return async (newReflection: TInput) => {
    await queryClient.cancelQueries({ queryKey })
    const previousData = queryClient.getQueryData<TData | null>(queryKey)

    queryClient.setQueryData(queryKey, (old: TData | null | undefined) =>
      old ? { ...old, ...newReflection } : buildOptimistic(newReflection)
    )

    return { previousData }
  }
}

/**
 * Builds the onError handler for a reflection mutation.
 * Rolls back to the previous cache snapshot and shows an error toast.
 */
export function buildReflectionOnError<TData>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  errorMessage: string
) {
  return (
    _error: unknown,
    _variables: unknown,
    context: { previousData?: TData | null } | undefined
  ) => {
    if (context?.previousData !== undefined) {
      queryClient.setQueryData(queryKey, context.previousData)
    }
    toast.error(errorMessage, { description: '잠시 후 다시 시도해주세요.' })
  }
}

/**
 * Builds the onSettled handler for a reflection mutation.
 * Invalidates the query to re-fetch fresh data from the server.
 */
export function buildReflectionOnSettled(queryClient: QueryClient, queryKey: readonly unknown[]) {
  return () => {
    queryClient.invalidateQueries({ queryKey })
  }
}
