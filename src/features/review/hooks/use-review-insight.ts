'use client'

import { useState, useCallback } from 'react'
import type { AiReviewInsightContext, AiReviewInsightResponse } from '@/lib/ai/types'

export function useReviewInsight() {
  const [data, setData] = useState<AiReviewInsightResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (context: AiReviewInsightContext) => {
    setIsLoading(true)
    setError(null)

    try {
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
      setData(result.data)
      return result.data
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return { data, isLoading, error, generate, reset }
}
