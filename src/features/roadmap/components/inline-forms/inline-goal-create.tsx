'use client'

import { useState, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Layers, Settings } from 'lucide-react'
import { InlineFormShell } from '@/features/roadmap/components/shared/inline-form-shell'
import { InlineFormActions } from '@/features/roadmap/components/shared/inline-form-actions'
import { Label } from '@/components/ui/label'
import { Chip } from '@/components/ui/chip'
import { Switch } from '@/components/ui/switch'
import {
  GoalNameSection,
  GoalWhySection,
  GoalPeriodSection,
} from '@/features/roadmap/components/inline-forms/goal-form-sections'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateGoal, useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useDirection } from '@/queries/use-direction'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import { useAiWhySuggestions } from '@/hooks/use-ai-why-suggestions'
import { SAMPLE_GOALS, SAMPLE_WHYS } from '@/lib/constants/onboarding'
import { DEFAULT_GROUP_NAMES } from '@/lib/constants/defaults'
import { createGoalSchema } from '@/lib/validations'
import { createGroup as createGroupAction } from '@/actions/group.actions'
import { queryKeys } from '@/lib/query/keys'
import { toast } from 'sonner'
import type { AiGoalBrainstormResponse, AiSuggestionItem } from '@/lib/ai/types'
import type { AreaType } from '@/types/entities'
import type { z } from 'zod'

type CreateGoalInput = z.input<typeof createGoalSchema>

interface InlineGoalCreateProps {
  areaId: string
  onDone: (newGoalId?: string) => void
}

export function InlineGoalCreate({ areaId, onDone }: InlineGoalCreateProps) {
  const queryClient = useQueryClient()
  const createGoal = useCreateGoal()
  const { data: areas = [] } = useAreas()
  const { data: goals = [] } = useGoals()
  const { data: direction } = useDirection()
  const aiSuggest = useAiSuggest()
  const aiWhy = useAiWhySuggestions({ target: 'goal-why' })

  const [withGroups, setWithGroups] = useState(true)
  const [aiGoalSuggestions, setAiGoalSuggestions] = useState<AiSuggestionItem[]>([])

  const area = areas.find((a) => a.id === areaId)
  const areaType = (area?.type ?? 'custom') as AreaType
  const sampleGoals = (SAMPLE_GOALS[areaType] ?? []).filter(
    (name) => !goals.some((g) => g.name === name)
  )
  const sampleWhys = SAMPLE_WHYS[areaType] ?? []

  const form = useForm<CreateGoalInput>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: { area_id: areaId, name: '', why: '', status: 'active' },
  })

  const currentName = useWatch({ control: form.control, name: 'name' })
  const currentWhy = useWatch({ control: form.control, name: 'why' }) ?? ''
  const startDate = useWatch({ control: form.control, name: 'start_date' })
  const targetDate = useWatch({ control: form.control, name: 'target_date' })
  const hasPeriod = !!(startDate || targetDate)

  const handleSubmit = async (values: CreateGoalInput) => {
    createGoal.mutate(
      {
        ...values,
        area_id: areaId,
        why: values.why || undefined,
        start_date: hasPeriod ? values.start_date : undefined,
        target_date: hasPeriod ? values.target_date : undefined,
      },
      {
        onSuccess: async (newGoal) => {
          if (withGroups && newGoal?.id) {
            try {
              const results = await Promise.all(
                DEFAULT_GROUP_NAMES.map((name) => createGroupAction({ goal_id: newGoal.id, name }))
              )
              const failed = results.filter((r) => !r.success)
              if (failed.length > 0) {
                toast.error('일부 그룹 생성에 실패했어요. 목표에서 직접 추가해주세요.')
              }
            } catch {
              toast.error('그룹 생성 중 문제가 발생했어요.')
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
          }
          toast.success('목표가 추가되었어요')
          onDone(newGoal?.id)
        },
      }
    )
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
          areaName: area?.name,
          areaType: area?.type,
          areaWhy: area?.why,
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
      areaName: area?.name,
      areaType: area?.type,
      goalName: currentName,
    })
  }

  return (
    <InlineFormShell
      onSubmit={form.handleSubmit(handleSubmit)}
      mode="create"
      title={
        area ? (
          <Chip variant="area" emoji={area.emoji} color={area.color}>
            {area.name}
          </Chip>
        ) : (
          '목표'
        )
      }
    >
      {/* Goal name: input + chips + AI */}
      <GoalNameSection
        form={form}
        currentName={currentName}
        sampleGoals={sampleGoals}
        goalAi={{ isLoading: aiSuggest.isPending, error: aiSuggest.error, suggestions: [] }}
        goalAiSuggestions={goalAiSuggestions}
        onGoalGenerate={handleGoalGenerate}
        idPrefix="inline-goal-name"
      />

      {/* Why */}
      <GoalWhySection
        form={form}
        currentWhy={currentWhy}
        sampleWhys={sampleWhys}
        whyAi={aiWhy}
        onWhyGenerate={handleWhyGenerate}
        idPrefix="inline-goal-why"
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
          idPrefix="inline-goal-period"
        />

        {/* Group auto-generation toggle */}
        <div className="flex items-center justify-between rounded-lg bg-[var(--color-bg-tertiary)]/50 px-3 py-2.5">
          <div>
            <Label htmlFor="inline-group-toggle" className="mb-0 flex items-center gap-1.5 text-xs">
              <Layers className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
              그룹별로 관리할까요?
            </Label>
            <p className="ml-5 text-[10px] text-[var(--color-text-tertiary)]">
              그룹 1, 그룹 2, 그룹 3이 자동 생성돼요
            </p>
          </div>
          <Switch id="inline-group-toggle" checked={withGroups} onCheckedChange={setWithGroups} />
        </div>
      </div>

      {/* Actions */}
      <InlineFormActions onCancel={() => onDone()} isPending={createGoal.isPending} />
    </InlineFormShell>
  )
}
