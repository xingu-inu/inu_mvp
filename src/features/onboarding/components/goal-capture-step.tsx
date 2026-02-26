'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, Loader2, Sparkles } from 'lucide-react'

import { Button, Chip } from '@/components/ui'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import type { AiBrainDumpResponse } from '@/lib/ai/types'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics'
import { GOAL_CHIP_CATEGORIES, GOAL_CHIP_OPTIONS } from '@/lib/constants/onboarding'
import { useOnboardingStore } from '@/stores/onboarding.store'
import { useStepKeyboard } from '../hooks/use-step-keyboard'

function uniqueGoals(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of values) {
    const value = raw.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }

  return result
}

function uniqueTaskNames(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of values) {
    const value = raw.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }

  return result
}

interface AiPreviewGoal {
  name: string
  tasks: string[]
}

function buildAiPreviewGoals(response: AiBrainDumpResponse): AiPreviewGoal[] {
  const byGoal = new Map<string, AiPreviewGoal>()

  for (const area of response.organizedItems ?? []) {
    for (const goal of area.goals ?? []) {
      const goalName = goal.name?.trim()
      if (!goalName) continue

      const key = goalName.toLowerCase()
      const existing = byGoal.get(key)

      if (!existing) {
        byGoal.set(key, {
          name: goalName,
          tasks: uniqueTaskNames(goal.tasks.map((task) => task.name)).slice(0, 3),
        })
        continue
      }

      existing.tasks = uniqueTaskNames([
        ...existing.tasks,
        ...goal.tasks.map((task) => task.name),
      ]).slice(0, 3)
    }
  }

  return Array.from(byGoal.values())
}

export function GoalCaptureStep() {
  const {
    selectedGoalChips,
    customGoals,
    toggleGoalChip,
    mergeCustomGoals,
    setAiPreparedTaskSeeds,
    organizeAndPrepareGoals,
    nextStep,
    prevStep,
  } = useOnboardingStore()

  const aiSuggest = useAiSuggest()

  const [freeText, setFreeText] = useState('')
  const [aiPreviewSummary, setAiPreviewSummary] = useState('')
  const [aiPreviewGoals, setAiPreviewGoals] = useState<AiPreviewGoal[]>([])
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null)

  const freeTextGoals = useMemo(
    () =>
      uniqueGoals(
        freeText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
      ),
    [freeText]
  )

  const mergedCustomGoals = useMemo(
    () => uniqueGoals([...customGoals, ...freeTextGoals]),
    [customGoals, freeTextGoals]
  )

  const selectedChipGoalNames = useMemo(
    () =>
      selectedGoalChips
        .map((chipId) => GOAL_CHIP_OPTIONS.find((chip) => chip.id === chipId)?.label ?? '')
        .filter(Boolean),
    [selectedGoalChips]
  )

  const totalCount = selectedGoalChips.length + mergedCustomGoals.length
  const exceedsLimit = totalCount > 5
  const canProceed = totalCount >= 1 && !exceedsLimit

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_VIEWED, { step: 'goal-capture' })
  }, [])

  const handleBack = () => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_BACK, { step: 'goal-capture' })
    prevStep()
  }

  const handleNext = () => {
    if (!canProceed) return

    if (aiPreviewGoals.length > 0) {
      mergeCustomGoals(aiPreviewGoals.map((goal) => goal.name))
    } else {
      mergeCustomGoals(freeTextGoals)
      setAiPreparedTaskSeeds([])
    }

    organizeAndPrepareGoals()
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_NEXT, {
      step: 'goal-capture',
      selected_goal_count: totalCount,
    })
    nextStep()
  }

  const handleAnalyzeWithAi = () => {
    const input = freeText.trim()
    if (!input) return

    setAiAnalysisError(null)

    trackEvent(ANALYTICS_EVENTS.ONBOARDING_AI_ENHANCE_REQUESTED, {
      step: 'goal-capture',
      source: 'free-text',
    })

    aiSuggest.mutate(
      {
        type: 'brain-dump',
        input,
        context: {
          direction: null,
          existingAreas: [],
          existingGoals: uniqueGoals([...selectedChipGoalNames, ...customGoals]),
        },
      },
      {
        onSuccess: (data) => {
          const response = data as AiBrainDumpResponse
          const previewGoals = buildAiPreviewGoals(response)

          if (previewGoals.length === 0) {
            setAiAnalysisError('AI could not extract structured goals from this input yet.')
            setAiPreviewSummary('')
            setAiPreviewGoals([])
            setAiPreparedTaskSeeds([])
            return
          }

          mergeCustomGoals(previewGoals.map((goal) => goal.name))
          setAiPreparedTaskSeeds(
            previewGoals.flatMap((goal) =>
              goal.tasks.map((taskName) => ({ goalName: goal.name, taskName }))
            )
          )
          setAiPreviewSummary(response.summary ?? '')
          setAiPreviewGoals(previewGoals)
        },
        onError: (error) => {
          setAiAnalysisError(error.message || 'AI analysis failed. Please try again.')
          setAiPreviewSummary('')
          setAiPreviewGoals([])
          setAiPreparedTaskSeeds([])
          trackEvent(ANALYTICS_EVENTS.ONBOARDING_AI_ENHANCE_FAILED, {
            step: 'goal-capture',
            source: 'free-text',
          })
        },
      }
    )
  }

  useStepKeyboard({ onNext: canProceed ? handleNext : undefined, onBack: handleBack, canProceed })

  return (
    <div className="flex flex-1 flex-col">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
          Pick your focus
        </h2>
        <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
          Choose 1 to 5 goals to get started quickly.
        </p>
      </div>

      <div className="space-y-4 pb-6">
        {GOAL_CHIP_CATEGORIES.map((category) => {
          const categoryChips = GOAL_CHIP_OPTIONS.filter(
            (option) => option.areaType === category.areaType
          )

          return (
            <div key={category.areaType}>
              <p className="mb-1.5 text-xs font-medium text-[var(--color-text-tertiary)]">
                {category.emoji} {category.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {categoryChips.map((option, index) => {
                  const selected = selectedGoalChips.includes(option.id)
                  const disabled = !selected && totalCount >= 5

                  return (
                    <motion.span
                      key={option.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Chip
                        variant="selection"
                        selected={selected}
                        onClick={() => {
                          if (disabled) return
                          toggleGoalChip(option.id)
                        }}
                        emoji={option.emoji}
                      >
                        {option.label}
                      </Chip>
                    </motion.span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mb-5">
        <p className="mb-2 text-xs font-medium text-[var(--color-text-tertiary)]">
          Or write directly
        </p>
        <textarea
          value={freeText}
          onChange={(e) => {
            setFreeText(e.target.value)
            setAiAnalysisError(null)
          }}
          placeholder={
            'Write anything on your mind\nAI can turn it into structured goals\nThen suggest first actions'
          }
          rows={4}
          className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary-500)] focus:outline-none"
        />

        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAnalyzeWithAi}
            disabled={!freeText.trim() || aiSuggest.isPending}
            className="gap-1.5"
          >
            {aiSuggest.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyze input with AI
              </>
            )}
          </Button>
        </div>

        {aiAnalysisError && (
          <p className="mt-2 text-xs text-[var(--color-miss)]" role="alert">
            {aiAnalysisError}
          </p>
        )}

        {aiPreviewGoals.length > 0 && (
          <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
            <p className="text-xs font-medium text-[var(--color-text-primary)]">AI draft preview</p>
            {aiPreviewSummary && (
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{aiPreviewSummary}</p>
            )}
            <div className="mt-2 space-y-2">
              {aiPreviewGoals.slice(0, 3).map((goal) => (
                <div key={goal.name} className="rounded-lg bg-[var(--color-bg-primary)] px-2 py-2">
                  <p className="text-xs font-medium text-[var(--color-text-primary)]">
                    {goal.name}
                  </p>
                  {goal.tasks.length > 0 && (
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      Tasks: {goal.tasks.join(' | ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-auto border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]/95 pt-4 pb-1 backdrop-blur">
        <p className="mb-2 text-xs text-[var(--color-text-tertiary)]">
          {totalCount}/5 selected
          {exceedsLimit ? ' (limit is 5)' : ''}
        </p>
        <div className="space-y-2">
          <Button onClick={handleNext} disabled={!canProceed} className="h-11 w-full">
            Next
          </Button>
          <Button variant="ghost" size="sm" onClick={handleBack} className="w-full gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>
    </div>
  )
}
