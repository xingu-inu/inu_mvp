'use client'

import { useState, useCallback } from 'react'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { ResponsiveModal, ModalBody } from '@/components/ui/responsive-modal'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import { BrainDumpInputStep } from './brain-dump-input-step'
import { BrainDumpReviewStep } from './brain-dump-review-step'
import { BrainDumpApplyStep } from './brain-dump-apply-step'
import { useBrainDumpApply } from '../../hooks/use-brain-dump-apply'
import type { BrainDumpReviewArea } from '../../hooks/use-brain-dump-apply'
import { toast } from 'sonner'
import type { AiBrainDumpResponse, AiBrainDumpArea } from '@/lib/ai/types'
import type { Area, Goal } from '@/types/entities'

type BrainDumpStep = 'input' | 'loading' | 'review' | 'applying'

interface BrainDumpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  areas: Area[]
  goals: Goal[]
  directionStatement?: string | null
}

const STEP_TITLES: Record<BrainDumpStep, string> = {
  input: '생각 쏟아내기',
  loading: '정리하는 중...',
  review: '이렇게 정리했어요',
  applying: '추가하는 중...',
}

const STEP_DESCRIPTIONS: Record<BrainDumpStep, string | undefined> = {
  input: '하고 싶은 것, 목표, 떠오르는 생각을 자유롭게 적어주세요.',
  loading: undefined,
  review: undefined,
  applying: undefined,
}

export function BrainDumpModal({
  open,
  onOpenChange,
  areas,
  goals,
  directionStatement,
}: BrainDumpModalProps) {
  const [step, setStep] = useState<BrainDumpStep>('input')
  const [inputText, setInputText] = useState('')
  const [reviewAreas, setReviewAreas] = useState<BrainDumpReviewArea[]>([])
  const [summary, setSummary] = useState('')
  const [error, setError] = useState<string | null>(null)

  const aiSuggest = useAiSuggest()
  const { apply, progress } = useBrainDumpApply()

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      // Prevent closing during loading or applying
      if (!newOpen && (step === 'loading' || step === 'applying')) return
      if (!newOpen) {
        // Reset state on close (keep inputText for re-use)
        setStep('input')
        setReviewAreas([])
        setSummary('')
        setError(null)
      }
      onOpenChange(newOpen)
    },
    [step, onOpenChange]
  )

  const handleSubmitInput = useCallback(() => {
    setStep('loading')
    setError(null)

    aiSuggest.mutate(
      {
        type: 'brain-dump',
        input: inputText,
        context: {
          direction: directionStatement,
          existingAreas: areas.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type || 'custom',
            emoji: a.emoji,
            color: a.color,
          })),
          existingGoals: goals.map((g) => g.name),
        },
      },
      {
        onSuccess: (data) => {
          const response = data as AiBrainDumpResponse
          if (!response.organizedItems?.length) {
            setError('입력한 내용에서 목표를 찾지 못했어요. 좀 더 구체적으로 적어보시겠어요?')
            setStep('input')
            return
          }

          // Resolve existingAreaId from areas prop when AI omits it
          const resolveAreaId = (aiArea: AiBrainDumpArea): string | undefined => {
            if (aiArea.existingAreaId) return aiArea.existingAreaId
            const byName = areas.find(
              (a) => a.name.toLowerCase().trim() === aiArea.name.toLowerCase().trim()
            )
            if (byName) return byName.id
            const byType = areas.filter((a) => a.type === aiArea.type)
            if (byType.length === 1) return byType[0].id
            return undefined
          }

          // Convert AI response to review state with _id and _checked
          let idCounter = 0
          const mapped: BrainDumpReviewArea[] = response.organizedItems.map((area) => {
            const resolvedAreaId = area.isExisting ? resolveAreaId(area) : undefined
            return {
              _id: `area-${idCounter++}`,
              _checked: true,
              name: area.name,
              emoji: area.emoji,
              color: area.color,
              type: area.type,
              isExisting: area.isExisting && !!resolvedAreaId,
              existingAreaId: resolvedAreaId,
              goals: area.goals.map((goal) => ({
                _id: `goal-${idCounter++}`,
                _checked: true,
                name: goal.name,
                why: goal.why,
                tasks: goal.tasks.map((task) => ({
                  _id: `task-${idCounter++}`,
                  _checked: true,
                  name: task.name,
                  why: task.why,
                  repeat_type: task.repeat_type || 'daily',
                  duration_minutes: task.duration_minutes || 15,
                  time_slot: task.time_slot || 'anytime',
                })),
              })),
            }
          })

          setReviewAreas(mapped)
          setSummary(response.summary)
          setStep('review')
        },
        onError: (err) => {
          setError(err.message || 'AI 응답을 생성하지 못했어요. 다시 시도해주세요.')
          setStep('input')
        },
      }
    )
  }, [inputText, areas, goals, directionStatement, aiSuggest])

  const handleApply = useCallback(async () => {
    setStep('applying')
    try {
      await apply(reviewAreas)
      handleOpenChange(false)
    } catch (error) {
      console.error('[brain-dump] Apply failed:', error)
      toast.error('항목 추가 중 오류가 발생했어요. 다시 시도해주세요.')
      setStep('review')
    }
  }, [reviewAreas, apply, handleOpenChange])

  const handleRetry = useCallback(() => {
    setStep('loading')
    handleSubmitInput()
  }, [handleSubmitInput])

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleOpenChange}
      title={STEP_TITLES[step]}
      description={STEP_DESCRIPTIONS[step]}
    >
      {step === 'input' && (
        <>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <BrainDumpInputStep
            value={inputText}
            onChange={setInputText}
            onSubmit={handleSubmitInput}
            onCancel={() => handleOpenChange(false)}
          />
        </>
      )}

      {step === 'loading' && (
        <ModalBody>
          <div className="flex flex-col items-center gap-5 py-12">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--color-primary-100)]">
              <Sparkles className="h-8 w-8 animate-pulse text-[var(--color-primary-500)]" />
              <Loader2 className="absolute -right-1.5 -bottom-1.5 h-5 w-5 animate-spin text-[var(--color-primary-400)]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                쏟아낸 생각을 정리하고 있어요
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                영역, 목표, 할 일로 분류하는 중...
              </p>
            </div>
          </div>
        </ModalBody>
      )}

      {step === 'review' && (
        <BrainDumpReviewStep
          areas={reviewAreas}
          onAreasChange={setReviewAreas}
          onApply={handleApply}
          onRetry={handleRetry}
          summary={summary}
        />
      )}

      {step === 'applying' && <BrainDumpApplyStep progress={progress} />}
    </ResponsiveModal>
  )
}
