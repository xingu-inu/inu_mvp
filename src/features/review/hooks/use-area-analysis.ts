'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import type { AiAreaAnalysisContext, AiAreaAnalysisResponse } from '@/lib/ai/types'

async function fetchAreaAnalysis(context: AiAreaAnalysisContext): Promise<AiAreaAnalysisResponse> {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'area-analysis', context }),
  })

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(errorData.error || '영역 분석 생성에 실패했습니다')
  }

  const result = (await response.json()) as { success: boolean; data: AiAreaAnalysisResponse }
  return result.data
}

interface UseAreaAnalysisParams {
  areaId: string
  period: string
  periodLabel: string
}

export function useAreaAnalysis({ areaId, period, periodLabel }: UseAreaAnalysisParams) {
  const queryClient = useQueryClient()
  const cacheKey = queryKeys.ai.areaAnalysis(areaId, period, periodLabel)

  // Reactive cache reader — never auto-fetches, only reads from cache
  const { data: cachedData } = useQuery<AiAreaAnalysisResponse>({
    queryKey: cacheKey,
    enabled: false,
    staleTime: STALE_TIMES.AI_ANALYSIS,
    gcTime: STALE_TIMES.AI_ANALYSIS,
  })

  // Mutation for the actual API call
  const mutation = useMutation({
    mutationFn: fetchAreaAnalysis,
    onSuccess: (data) => {
      queryClient.setQueryData(cacheKey, data)
    },
  })

  const generate = useCallback(
    (context: AiAreaAnalysisContext) => mutation.mutateAsync(context).catch(() => null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutation.mutateAsync]
  )

  const reset = useCallback(() => {
    mutation.reset()
    queryClient.removeQueries({ queryKey: cacheKey })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.reset, queryClient, cacheKey])

  return {
    data: cachedData ?? null,
    isLoading: mutation.isPending,
    error: mutation.error
      ? mutation.error instanceof Error
        ? mutation.error.message
        : '알 수 없는 오류'
      : null,
    generate,
    reset,
  }
}
