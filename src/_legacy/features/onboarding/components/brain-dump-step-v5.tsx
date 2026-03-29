'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, AlertCircle, ChevronLeft } from 'lucide-react'
import { Button, Chip } from '@/components/ui'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import { useOnboardingStore } from '@/stores/onboarding.store'
import type { V5ReviewArea, V5ReviewGoal, V5ReviewTask } from '@/stores/onboarding.store'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import {
  BRAIN_DUMP_POPULAR_CHIPS,
  AREA_PRESETS_EXTENDED,
  SAMPLE_TASKS,
} from '@/lib/constants/onboarding'
import type { AreaType } from '@/types/entities'
import { useStepKeyboard } from '../hooks/use-step-keyboard'
import type { AiBrainDumpResponse, AiBrainDumpArea } from '@/lib/ai/types'

const PLACEHOLDER = `위에서 고르거나, 여기에 자유롭게 적어보세요
예) 살 빼고 싶다, 영어 공부 다시 시작, 저축 좀 해야하는데...`

const MAX_LENGTH = 2000

/** 칩만 선택된 경우 AI 없이 즉시 review 데이터를 빌드 */
function buildReviewAreasFromChips(selectedChipIds: string[]): V5ReviewArea[] {
  const chips = BRAIN_DUMP_POPULAR_CHIPS.filter((c) => selectedChipIds.includes(c.id))

  // areaType 기준으로 그룹핑
  const byArea = new Map<AreaType, typeof chips>()
  for (const chip of chips) {
    const list = byArea.get(chip.areaType) ?? []
    list.push(chip)
    byArea.set(chip.areaType, list)
  }

  let idCounter = 0
  return Array.from(byArea.entries()).map(([areaType, areaChips]) => {
    const preset = AREA_PRESETS_EXTENDED.find((a) => a.type === areaType) ?? {
      name: '기타',
      type: 'custom' as AreaType,
      emoji: '🎯',
      color: '#8a7a65',
    }
    const sampleTasks = (SAMPLE_TASKS[areaType] ?? []).slice(0, 2)

    return {
      _id: `area-${idCounter++}`,
      _checked: true,
      name: preset.name,
      emoji: preset.emoji,
      color: preset.color,
      type: areaType,
      isExisting: false,
      goals: areaChips.map(
        (chip): V5ReviewGoal => ({
          _id: `goal-${idCounter++}`,
          _checked: true,
          name: chip.label,
          tasks: sampleTasks.map(
            (taskName): V5ReviewTask => ({
              _id: `task-${idCounter++}`,
              _checked: true,
              name: taskName,
              repeat_type: 'daily',
              duration_minutes: 15,
              time_slot: 'anytime',
            })
          ),
        })
      ),
    }
  })
}

export function BrainDumpStepV5() {
  const {
    v5BrainDumpText,
    setV5BrainDumpText,
    setV5ReviewAreas,
    setV5Summary,
    nextStep,
    prevStep,
  } = useOnboardingStore()

  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const aiSuggest = useAiSuggest()

  const toggleChip = useCallback(
    (chipId: string) => {
      setSelectedChips((prev) =>
        prev.includes(chipId) ? prev.filter((id) => id !== chipId) : [...prev, chipId]
      )
      if (error) setError(null)
    },
    [error]
  )

  // Combined input: chip labels + textarea text
  const combinedInput = useMemo(() => {
    const chipLines = selectedChips
      .map((id) => BRAIN_DUMP_POPULAR_CHIPS.find((c) => c.id === id)?.label ?? '')
      .filter(Boolean)
    const parts = [...chipLines, v5BrainDumpText.trim()].filter(Boolean)
    return parts.join('\n')
  }, [selectedChips, v5BrainDumpText])

  const isValid = combinedInput.length > 0
  const hasFreeText = v5BrainDumpText.trim().length > 0
  // 칩만 있으면 AI 불필요, 자유 텍스트가 있으면 AI 필요
  const needsAi = hasFreeText

  const handleSubmit = useCallback(() => {
    if (!isValid || isLoading) return
    setError(null)

    // 칩만 선택된 경우: AI 없이 즉시 review 빌드
    if (!hasFreeText && selectedChips.length > 0) {
      const areas = buildReviewAreasFromChips(selectedChips)
      setV5ReviewAreas(areas)
      setV5Summary('')
      trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
        step: 'brain-dump-v5',
        mode: 'chips-only',
        chip_count: selectedChips.length,
      })
      nextStep()
      return
    }

    // 자유 텍스트 포함: AI 호출
    setIsLoading(true)
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_AI_ENHANCE_REQUESTED, {
      step: 'brain-dump-v5',
      chip_count: selectedChips.length,
      has_freetext: true,
    })

    aiSuggest.mutate(
      {
        type: 'brain-dump',
        input: combinedInput,
        context: {
          direction: null,
          existingAreas: [],
          existingGoals: [],
        },
      },
      {
        onSuccess: (data) => {
          const response = data as AiBrainDumpResponse

          if (!response.organizedItems?.length) {
            setError('입력한 내용에서 목표를 찾지 못했어요. 좀 더 구체적으로 적어보시겠어요?')
            setIsLoading(false)
            return
          }

          let idCounter = 0
          const mapped: V5ReviewArea[] = response.organizedItems.map((area: AiBrainDumpArea) => ({
            _id: `area-${idCounter++}`,
            _checked: true,
            name: area.name,
            emoji: area.emoji,
            color: area.color,
            type: area.type,
            isExisting: false,
            existingAreaId: undefined,
            goals: area.goals.map(
              (goal): V5ReviewGoal => ({
                _id: `goal-${idCounter++}`,
                _checked: true,
                name: goal.name,
                why: goal.why,
                tasks: goal.tasks.map(
                  (task): V5ReviewTask => ({
                    _id: `task-${idCounter++}`,
                    _checked: true,
                    name: task.name,
                    why: task.why,
                    repeat_type: task.repeat_type || 'daily',
                    duration_minutes: task.duration_minutes || 15,
                    time_slot: task.time_slot || 'anytime',
                  })
                ),
              })
            ),
          }))

          setV5ReviewAreas(mapped)
          setV5Summary(response.summary ?? '')
          trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETED, {
            step: 'brain-dump-v5',
            mode: 'ai',
          })
          nextStep()
        },
        onError: (err) => {
          setError(err.message || 'AI 응답을 생성하지 못했어요. 다시 시도해주세요.')
          setIsLoading(false)
          trackEvent(ANALYTICS_EVENTS.ONBOARDING_AI_ENHANCE_FAILED, { step: 'brain-dump-v5' })
        },
      }
    )
  }, [
    isValid,
    isLoading,
    hasFreeText,
    selectedChips,
    combinedInput,
    aiSuggest,
    setV5ReviewAreas,
    setV5Summary,
    nextStep,
  ])

  useStepKeyboard({ onBack: prevStep, canProceed: false })

  return (
    <div className="flex flex-1 flex-col">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center gap-5"
          >
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
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col"
          >
            <div className="mb-4">
              <h2 className="mb-1 text-xl font-bold text-[var(--color-text-primary)]">
                하고 싶은 것들을 골라보세요
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                탭 하거나 직접 적어도 돼요
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-950 dark:text-red-400"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Popular chips — flat grid */}
            <div className="mb-4 flex flex-wrap gap-2">
              {BRAIN_DUMP_POPULAR_CHIPS.map((chip) => (
                <Chip
                  key={chip.id}
                  variant="selection"
                  selected={selectedChips.includes(chip.id)}
                  onClick={() => toggleChip(chip.id)}
                  emoji={chip.emoji}
                >
                  {chip.label}
                </Chip>
              ))}
            </div>

            {/* Free text */}
            <div className="mb-2">
              <textarea
                value={v5BrainDumpText}
                onChange={(e) => {
                  setV5BrainDumpText(e.target.value.slice(0, MAX_LENGTH))
                  if (error) setError(null)
                }}
                placeholder={PLACEHOLDER}
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary-500)] focus:outline-none"
                aria-label="생각 쏟아내기 입력"
              />
              {v5BrainDumpText.length > MAX_LENGTH * 0.85 && (
                <p
                  className="mt-1 px-1 text-right text-[11px] text-[var(--color-miss)] tabular-nums"
                  aria-live="polite"
                >
                  {v5BrainDumpText.length}/{MAX_LENGTH}
                </p>
              )}
            </div>

            <div className="mt-auto space-y-2 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!isValid}
                className="w-full gap-1.5"
                size="lg"
              >
                {needsAi ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    AI로 정리하기
                  </>
                ) : (
                  <>
                    바로 확인하기
                    {selectedChips.length > 0 && (
                      <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                        {selectedChips.length}개
                      </span>
                    )}
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={prevStep} className="w-full gap-1">
                <ChevronLeft className="h-4 w-4" />
                이전으로
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
