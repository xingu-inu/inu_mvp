import { useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { AiGenerateRequest, AiGenerateResponse } from '@/lib/ai/types'

const HEAVY_TYPES = new Set(['priority-rank', 'roadmap-diagnosis', 'brain-dump', 'task-suggest'])

function getTimeoutMs(type: AiGenerateRequest['type']): number {
  return HEAVY_TYPES.has(type) ? 45_000 : 20_000
}

interface AiApiResponse {
  success: boolean
  data?: AiGenerateResponse
  error?: { code: string; message: string }
}

async function fetchAiSuggestion(
  request: AiGenerateRequest,
  signal?: AbortSignal
): Promise<AiGenerateResponse> {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })

  const result: AiApiResponse = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || 'AI 제안 생성에 실패했습니다.')
  }

  return result.data
}

export function useAiSuggest() {
  const abortRef = useRef<AbortController | null>(null)

  const mutation = useMutation({
    mutationFn: (request: AiGenerateRequest) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs(request.type))

      return fetchAiSuggestion(request, controller.signal).finally(() => {
        clearTimeout(timeoutId)
        if (abortRef.current === controller) {
          abortRef.current = null
        }
      })
    },
  })

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  return { ...mutation, abort }
}
