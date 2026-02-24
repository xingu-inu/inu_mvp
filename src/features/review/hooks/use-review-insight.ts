'use client'

import { useMutation } from '@tanstack/react-query'
import type { AiReviewInsightContext, AiReviewInsightResponse } from '@/lib/ai/types'

async function fetchReviewInsight(
  context: AiReviewInsightContext
): Promise<AiReviewInsightResponse> {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'review-insight', context }),
  })

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(errorData.error || '분석 생성에 실패했습니다')
  }

  const result = (await response.json()) as { success: boolean; data: AiReviewInsightResponse }
  return result.data
}

export function useReviewInsight() {
  const mutation = useMutation({
    mutationFn: fetchReviewInsight,
  })

  return {
    data: mutation.data ?? null,
    isLoading: mutation.isPending,
    error: mutation.error
      ? mutation.error instanceof Error
        ? mutation.error.message
        : '알 수 없는 오류'
      : null,
    generate: (context: AiReviewInsightContext) => mutation.mutateAsync(context).catch(() => null),
    reset: mutation.reset,
  }
}
