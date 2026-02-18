'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { InlineFormShell } from '@/features/roadmap/components/shared/inline-form-shell'
import { InlineFormActions } from '@/features/roadmap/components/shared/inline-form-actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Chip } from '@/components/ui/chip'
import { SampleChips } from '@/features/roadmap/components/shared/sample-chips'
import { useCreateTask } from '@/queries/use-tasks'
import { useGoalWithRelations } from '@/queries/use-goals'
import { getTaskNameSuggestions, getWhySuggestions } from '@/lib/utils/why-generator'
import { createTaskSchema, type CreateTaskSchema } from '@/lib/validations'
import { TaskFormFields } from '@/features/roadmap/components/shared/task-form-fields'
import { CrossAreaPicker } from '@/features/roadmap/components/shared/cross-area-picker'
import type { AreaType } from '@/types/entities'

interface InlineTaskCreateProps {
  goalId: string
  defaultGroupId?: string
  onDone: () => void
}

export function InlineTaskCreate({ goalId, defaultGroupId, onDone }: InlineTaskCreateProps) {
  const { goal, groups } = useGoalWithRelations(goalId)
  const createTask = useCreateTask()

  const [selectedCrossAreaIds, setSelectedCrossAreaIds] = useState<string[]>([])

  const form = useForm({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      goal_id: goalId,
      group_id: defaultGroupId,
      name: '',
      why: '',
      repeat_type: 'daily',
      duration_minutes: 15,
      time_slot: 'anytime',
      scheduled_date: undefined,
      start_date: undefined,
      end_date: undefined,
    },
  })

  const selectedGroupId = useWatch({ control: form.control, name: 'group_id' })
  const selectedName = useWatch({ control: form.control, name: 'name' })
  const currentWhy = useWatch({ control: form.control, name: 'why' })
  const availableGroups = groups.filter((g) => !g.is_completed)

  // Computed suggestions
  const areaType: AreaType = (goal?.area?.type as AreaType) ?? 'custom'
  const nameSuggestions = getTaskNameSuggestions(areaType)
  const whySuggestions = getWhySuggestions(
    { name: goal?.name ?? '', why: goal?.why },
    { type: areaType }
  )
  const handleSubmit = (values: Record<string, unknown>) => {
    const data = values as CreateTaskSchema
    createTask.mutate({
      ...data,
      goal_id: goalId,
      why: data.why || undefined,
      related_area_ids: selectedCrossAreaIds.length > 0 ? selectedCrossAreaIds : undefined,
    })
    // Optimistic: 즉시 폼 닫기 (캐시는 onMutate에서 이미 업데이트됨)
    onDone()
  }

  return (
    <InlineFormShell onSubmit={form.handleSubmit(handleSubmit)} mode="create" title="할 일">
      {/* Group Selection */}
      {availableGroups.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">그룹 (선택)</Label>
          <div className="flex flex-wrap gap-1.5">
            <Chip
              variant="selection"
              selected={!selectedGroupId}
              onClick={() => form.setValue('group_id', undefined)}
              className="cursor-pointer text-xs"
            >
              없음
            </Chip>
            {availableGroups.map((group) => (
              <Chip
                key={group.id}
                variant="selection"
                selected={selectedGroupId === group.id}
                onClick={() => form.setValue('group_id', group.id)}
                className="cursor-pointer text-xs"
              >
                {group.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Task Name */}
      <div className="space-y-1.5">
        <Label className="text-xs">이름</Label>
        <Input
          placeholder="예: 매일 30분 러닝하기"
          autoFocus
          value={selectedName}
          onChange={(e) => form.setValue('name', e.target.value)}
        />
        <SampleChips
          items={nameSuggestions}
          selectedValue={selectedName}
          onToggle={(val) =>
            form.setValue('name', selectedName === val ? '' : val, {
              shouldValidate: true,
            })
          }
        />
        {form.formState.errors.name && (
          <p className="text-xs text-[var(--color-miss)]">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Why */}
      <div className="space-y-1.5">
        <Label className="text-xs">왜 이 할 일을? (선택)</Label>
        <Input
          placeholder="예: 기초 체력을 키우기 위해"
          value={currentWhy}
          onChange={(e) => form.setValue('why', e.target.value)}
        />
        <SampleChips
          items={whySuggestions.map((s) => s.text)}
          selectedValue={currentWhy ?? ''}
          onToggle={(val) => form.setValue('why', currentWhy === val ? '' : val)}
        />
      </div>

      {/* Cross-area */}
      <CrossAreaPicker
        primaryAreaId={goal?.area_id ?? null}
        selectedIds={selectedCrossAreaIds}
        onChange={setSelectedCrossAreaIds}
      />

      {/* Repeat / Duration / Time Slot */}
      <TaskFormFields form={form} compact />

      {/* Actions */}
      <InlineFormActions onCancel={onDone} isPending={false} />
    </InlineFormShell>
  )
}
