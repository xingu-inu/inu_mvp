'use client'

import { useState, useCallback } from 'react'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import type { AiContext, AiSuggestionItem, AiWhyVisionResponse } from '@/lib/ai/types'

type WhyTarget = 'area-why' | 'goal-why' | 'group-why' | 'task-why' | 'direction-why'

interface UseAiWhySuggestionsOptions {
  target: WhyTarget
}

export function useAiWhySuggestions({ target }: UseAiWhySuggestionsOptions) {
  const aiSuggest = useAiSuggest()
  const [suggestions, setSuggestions] = useState<AiSuggestionItem[]>([])

  const generate = useCallback(
    (context: AiContext) => {
      aiSuggest.mutate(
        { type: 'why-vision', context, target },
        {
          onSuccess: (data) => {
            const res = data as AiWhyVisionResponse
            setSuggestions(res.suggestions || [])
          },
        }
      )
    },
    [aiSuggest, target]
  )

  const reset = useCallback(() => {
    setSuggestions([])
  }, [])

  return {
    suggestions,
    generate,
    reset,
    isLoading: aiSuggest.isPending,
    error: aiSuggest.error,
  }
}
