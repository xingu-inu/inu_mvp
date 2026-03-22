'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence } from 'framer-motion'
import { Layers, Settings } from 'lucide-react'
import { AnimatedCollapse } from '@/features/roadmap/components/shared/animated-collapse'
import { InlineFormShell } from '@/features/roadmap/components/shared/inline-form-shell'
import { InlineFormActions } from '@/features/roadmap/components/shared/inline-form-actions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Chip } from '@/components/ui/chip'
import {
  GoalNameSection,
  GoalWhySection,
  GoalPeriodSection,
} from '@/features/roadmap/components/inline-forms/goal-form-sections'
import { useUpdateGoal, useGoalWithRelations, useGoals } from '@/queries/use-goals'
import { useEnableGoalGroups, useDisableGoalGroups } from '@/queries/use-groups'
import { useDirection } from '@/queries/use-direction'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import { useAiWhySuggestions } from '@/hooks/use-ai-why-suggestions'
import { updateGoalSchema, type UpdateGoalSchema } from '@/lib/validations'
import { SAMPLE_GOALS, SAMPLE_WHYS } from '@/lib/constants/onboarding'
import { toast } from 'sonner'
import type { Goal, Area, AreaType } from '@/types/entities'
import type { AiSuggestionItem, AiGoalBrainstormResponse } from '@/lib/ai/types'

interface InlineGoalEditProps {
  goal: Goal
  area: Area
  onDone: () => void
}

export function InlineGoalEdit({ goal, area, onDone }: InlineGoalEditProps) {
  const updateGoal = useUpdateGoal()
  const { groups } = useGoalWithRelations(goal.id)
  const { data: goals = [] } = useGoals()
  const enableGroups = useEnableGoalGroups()
  const disableGroups = useDisableGoalGroups()
  const { data: direction } = useDirection()
  const aiSuggest = useAiSuggest()
  const aiWhy = useAiWhySuggestions({ target: 'goal-why' })
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)

  const [aiGoalSuggestions, setAiGoalSuggestions] = useState<AiSuggestionItem[]>([])

  const areaType: AreaType = (area.type ?? 'custom') as AreaType
  const sampleGoals = (SAMPLE_GOALS[areaType] ?? []).filter(
    (name) => !goals.some((g) => g.name === name)
  )
  const sampleWhys = SAMPLE_WHYS[areaType] ?? []
  const hasGroups = groups.length > 0

  const form = useForm<UpdateGoalSchema>({
    resolver: zodResolver(updateGoalSchema),
    defaultValues: {
      name: goal.name,
      why: goal.why || '',
      status: goal.status,
      start_date: goal.start_date || undefined,
      target_date: goal.target_date || undefined,
    },
  })

  const currentName = useWatch({ control: form.control, name: 'name' })
  const startDate = useWatch({ control: form.control, name: 'start_date' })
  const targetDate = useWatch({ control: form.control, name: 'target_date' })
  const hasPeriod = !!(startDate || targetDate)
  const whyValue = useWatch({ control: form.control, name: 'why' })

  // Reset when goal data changes externally
  useEffect(() => {
    form.reset({
      name: goal.name,
      why: goal.why || '',
      status: goal.status,
      start_date: goal.start_date || undefined,
      target_date: goal.target_date || undefined,
    })
  }, [goal.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (values: UpdateGoalSchema) => {
    updateGoal.mutate(
      {
        id: goal.id,
        input: {
          ...values,
          why: values.why || undefined,
          start_date: hasPeriod ? values.start_date : undefined,
          target_date: hasPeriod ? values.target_date : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('목표가 수정되었어요')
          onDone()
        },
      }
    )
  }

  const handleCancel = () => {
    form.reset()
    onDone()
  }

  // Goal AI suggestions (derived from mutation data)
  const goalAiSuggestions = useMemo(() => {
    return (
      (aiSuggest.data as AiGoalBrainstormResponse | undefined)?.suggestions ?? aiGoalSuggestions
    )
  }, [aiSuggest.data, aiGoalSuggestions])

  const handleGoalGenerate = () => {
    aiSuggest.mutate(
      {
        type: 'goal-brainstorm',
        context: {
          direction: direction?.statement,
          areaName: area.name,
          areaType: area.type,
          areaWhy: area.why,
          existingGoals: goals.map((g) => g.name),
        },
      },
      {
        onSuccess: (data) => {
          const res = data as AiGoalBrainstormResponse
          setAiGoalSuggestions(res.suggestions || [])
        },
      }
    )
  }

  const handleWhyGenerate = () => {
    aiWhy.generate({
      direction: direction?.statement,
      areaName: area.name,
      areaType: area.type,
      goalName: currentName,
    })
  }

  return (
    <InlineFormShell
      onSubmit={form.handleSubmit(handleSubmit)}
      mode="edit"
      title={
        <Chip variant="area" emoji={area.emoji} color={area.color}>
          {area.name}
        </Chip>
      }
      animated={false}
    >
      {/* Goal Name */}
      <GoalNameSection
        form={form}
        currentName={currentName ?? ''}
        sampleGoals={sampleGoals}
        goalAi={{ isLoading: aiSuggest.isPending, error: aiSuggest.error, suggestions: [] }}
        goalAiSuggestions={goalAiSuggestions}
        onGoalGenerate={handleGoalGenerate}
        idPrefix={`edit-name-${goal.id}`}
      />

      {/* Why */}
      <GoalWhySection
        form={form}
        currentWhy={whyValue || ''}
        sampleWhys={sampleWhys}
        whyAi={aiWhy}
        onWhyGenerate={handleWhyGenerate}
        idPrefix={`edit-why-${goal.id}`}
      />

      {/* Settings */}
      <div className="space-y-2">
        <span className="flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
          <Settings className="h-3 w-3" />
          설정
        </span>

        {/* Period */}
        <GoalPeriodSection
          form={form}
          hasPeriod={hasPeriod}
          startDate={startDate}
          targetDate={targetDate}
          idPrefix={`edit-period-${goal.id}`}
        />

        {/* Group Management Toggle */}
        <div className="rounded-lg bg-[var(--color-bg-tertiary)]/50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <Label
                htmlFor={`edit-groups-${goal.id}`}
                className="mb-0 flex items-center gap-1.5 text-xs"
              >
                <Layers className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
                그룹 관리
              </Label>
              <p className="ml-5 text-[10px] text-[var(--color-text-tertiary)]">
                목표를 그룹별로 나눠 관리해요
              </p>
            </div>
            <Switch
              id={`edit-groups-${goal.id}`}
              checked={hasGroups}
              disabled={enableGroups.isPending || disableGroups.isPending}
              onCheckedChange={(checked) => {
                if (checked) {
                  enableGroups.mutate({ goalId: goal.id })
                } else {
                  setShowDisableConfirm(true)
                }
              }}
            />
          </div>
          <AnimatePresence>
            {showDisableConfirm && (
              <AnimatedCollapse>
                <div className="mt-2 rounded-lg bg-[var(--color-miss-bg)] p-2.5">
                  <p className="text-xs text-[var(--color-miss)]">
                    모든 그룹이 삭제되고 할 일은 직접 연결로 변경돼요
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 flex-1 text-xs"
                      onClick={() => setShowDisableConfirm(false)}
                    >
                      취소
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 flex-1 text-xs text-[var(--color-miss)]"
                      isLoading={disableGroups.isPending}
                      onClick={() => {
                        disableGroups.mutate(
                          { goalId: goal.id },
                          { onSuccess: () => setShowDisableConfirm(false) }
                        )
                      }}
                    >
                      해제
                    </Button>
                  </div>
                </div>
              </AnimatedCollapse>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Actions */}
      <InlineFormActions
        onCancel={handleCancel}
        isPending={updateGoal.isPending}
        submitLabel="저장"
      />
    </InlineFormShell>
  )
}
