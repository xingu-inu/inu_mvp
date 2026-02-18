'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { ListOrdered, Loader2, RefreshCw } from 'lucide-react'
import { ResponsiveModal, ModalBody, ModalFooter } from '@/components/ui/responsive-modal'
import { Button } from '@/components/ui/button'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import { usePriorityRankContext } from '../hooks/use-priority-rank-context'
import { TierSection } from './ai-priority-rank-preview'
import { useHomeStore } from '@/stores/home.store'
import { isSameDay } from 'date-fns'
import type { AiPriorityRankResponse } from '@/lib/ai/types'

type PriorityRankStep = 'loading' | 'review' | 'done'

export function PriorityRankModal() {
  const priorityContext = usePriorityRankContext()
  const aiSuggest = useAiSuggest()

  const isPriorityRankOpen = useHomeStore((s) => s.isPriorityRankOpen)
  const setIsPriorityRankOpen = useHomeStore((s) => s.setIsPriorityRankOpen)
  const selectTask = useHomeStore((s) => s.selectTask)
  const applyPriorityRank = useHomeStore((s) => s.applyPriorityRank)
  const setPriorityRankResult = useHomeStore((s) => s.setPriorityRankResult)

  const [step, setStep] = useState<PriorityRankStep>('loading')
  const [result, setResult] = useState<AiPriorityRankResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isClosingRef = useRef(false)
  const requestedRef = useRef(false)

  // Elapsed timer during loading
  useEffect(() => {
    if (step === 'loading' && !error && isPriorityRankOpen) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [step, error, isPriorityRankOpen])

  // When modal opens: check cache or prepare loading state
  useEffect(() => {
    if (!isPriorityRankOpen) {
      requestedRef.current = false
      return
    }

    isClosingRef.current = false

    // Check cache first
    const cached = useHomeStore.getState()
    const hasCache =
      cached.priorityRankResult &&
      cached.priorityRankDate &&
      isSameDay(new Date(cached.priorityRankDate), new Date())

    if (hasCache && cached.priorityRankResult) {
      setResult(cached.priorityRankResult)
      setStep('review')
      setError(null)
      return
    }

    // Prepare for new generation
    setStep('loading')
    setResult(null)
    setError(null)
    setElapsed(0)
    requestedRef.current = false
  }, [isPriorityRankOpen])

  // When context is ready + modal is open in loading state: fire request
  useEffect(() => {
    if (!isPriorityRankOpen || step !== 'loading' || error) return
    if (requestedRef.current || aiSuggest.isPending) return
    if (!priorityContext) return

    requestedRef.current = true
    aiSuggest.mutate(
      { type: 'priority-rank', context: priorityContext },
      {
        onSuccess: (data) => {
          const rankResult = data as AiPriorityRankResponse
          setResult(rankResult)
          setStep('review')
          setPriorityRankResult(rankResult, new Date().toISOString())
        },
        onError: (err) => {
          requestedRef.current = false
          const isAbort =
            (err instanceof Error && err.name === 'AbortError') ||
            (err instanceof DOMException && err.name === 'AbortError')
          if (isAbort && isClosingRef.current) return
          setError(
            isAbort
              ? '시간이 너무 오래 걸렸어요. 다시 시도해주세요.'
              : 'AI 응답을 생성하지 못했어요.'
          )
        },
      }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPriorityRankOpen, step, error, priorityContext, aiSuggest.isPending])

  const triggerGenerate = useCallback(() => {
    if (!priorityContext || aiSuggest.isPending) return
    setStep('loading')
    setError(null)
    setElapsed(0)
    requestedRef.current = true
    aiSuggest.mutate(
      { type: 'priority-rank', context: priorityContext },
      {
        onSuccess: (data) => {
          const rankResult = data as AiPriorityRankResponse
          setResult(rankResult)
          setStep('review')
          setPriorityRankResult(rankResult, new Date().toISOString())
        },
        onError: (err) => {
          requestedRef.current = false
          const isAbort =
            (err instanceof Error && err.name === 'AbortError') ||
            (err instanceof DOMException && err.name === 'AbortError')
          if (isAbort && isClosingRef.current) return
          setError(
            isAbort
              ? '시간이 너무 오래 걸렸어요. 다시 시도해주세요.'
              : 'AI 응답을 생성하지 못했어요.'
          )
        },
      }
    )
  }, [priorityContext, aiSuggest, setPriorityRankResult])

  // Close handler — only handles closing (open is driven by useEffect above)
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        isClosingRef.current = true
        aiSuggest.abort()
        setIsPriorityRankOpen(false)
        setStep('loading')
        setResult(null)
        setError(null)
      }
    },
    [aiSuggest, setIsPriorityRankOpen]
  )

  const handleTaskClick = (taskId: string) => {
    selectTask(taskId)
    setIsPriorityRankOpen(false)
  }

  const handleApply = () => {
    if (!result) return
    applyPriorityRank(result)
    // applyPriorityRank closes modal via store
  }

  const loadingMessage =
    elapsed < 3
      ? '스트릭, 목표, 시간대를 고려하는 중...'
      : elapsed < 8
        ? '거의 다 됐어요...'
        : '조금만 더 기다려주세요...'

  const title = step === 'loading' ? '우선순위 분석 중...' : '이렇게 정리했어요'

  return (
    <ResponsiveModal open={isPriorityRankOpen} onOpenChange={handleOpenChange} title={title}>
      {/* Loading Step */}
      {step === 'loading' && !error && (
        <ModalBody>
          <div className="flex flex-col items-center gap-5 py-12">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-primary-100)]">
              <ListOrdered className="h-8 w-8 animate-pulse text-[var(--color-primary-500)]" />
              <Loader2 className="absolute -right-1.5 -bottom-1.5 h-5 w-5 animate-spin text-[var(--color-primary-400)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                우선순위를 분석하고 있어요
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">{loadingMessage}</p>
            </div>
          </div>
        </ModalBody>
      )}

      {/* Error (within loading step) */}
      {step === 'loading' && error && (
        <ModalBody>
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
            <Button variant="secondary" size="sm" onClick={triggerGenerate}>
              다시 시도
            </Button>
          </div>
        </ModalBody>
      )}

      {/* Review Step */}
      {step === 'review' && result && (
        <ModalBody>
          <p className="text-sm text-[var(--color-text-secondary)]">{result.summary}</p>

          <div className="space-y-2">
            {result.tiers.map((tier) => (
              <TierSection key={tier.tier} tier={tier} onTaskClick={handleTaskClick} />
            ))}
          </div>

          <div className="rounded-lg bg-[var(--color-primary-50)] px-3 py-2">
            <p className="text-sm text-[var(--color-ai)]">
              <span className="mr-1">💡</span>
              {result.insight}
            </p>
          </div>

          <ModalFooter>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 gap-1"
              onClick={triggerGenerate}
              disabled={aiSuggest.isPending}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              다시 분석하기
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1 bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] text-white"
              onClick={handleApply}
            >
              반영하기
            </Button>
          </ModalFooter>
        </ModalBody>
      )}
    </ResponsiveModal>
  )
}
