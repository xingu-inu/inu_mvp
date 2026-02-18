'use client'

import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { InlineFormShell } from '@/features/roadmap/components/shared/inline-form-shell'
import { InlineFormActions } from '@/features/roadmap/components/shared/inline-form-actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SampleChips } from '@/features/roadmap/components/shared/sample-chips'
import { AiSuggestionPanel } from '@/components/common/ai-suggestion-panel'
import { useCreateGroup, useUpdateGroup } from '@/queries/use-groups'
import { useGoalWithRelations } from '@/queries/use-goals'
import { useDirection } from '@/queries/use-direction'
import { useAiWhySuggestions } from '@/hooks/use-ai-why-suggestions'
import {
  createGroupSchema,
  updateGroupSchema,
  type CreateGroupSchema,
  type UpdateGroupSchema,
} from '@/lib/validations'
import { SAMPLE_GROUP_NAMES, SAMPLE_GROUP_WHYS } from '@/lib/constants/onboarding'

interface InlineGroupFormProps {
  mode: 'create' | 'edit'
  goalId: string
  groupId?: string
  onDone: () => void
}

export function InlineGroupForm({ mode, goalId, groupId, onDone }: InlineGroupFormProps) {
  const isEdit = mode === 'edit'

  const createGroup = useCreateGroup()
  const updateGroup = useUpdateGroup()
  const { goal, groups } = useGoalWithRelations(goalId)
  const { data: direction } = useDirection()
  const aiWhy = useAiWhySuggestions({ target: 'group-why' })

  const group = isEdit ? groups.find((g) => g.id === groupId) : undefined
  const existingNames = groups.map((g) => g.name)
  const availableNames = SAMPLE_GROUP_NAMES.filter((name) => !existingNames.includes(name))

  // Use the appropriate schema based on mode
  const form = useForm<CreateGroupSchema | UpdateGroupSchema>({
    resolver: zodResolver(isEdit ? updateGroupSchema : createGroupSchema),
    defaultValues: isEdit ? undefined : { goal_id: goalId, name: '', why: '', description: '' },
  })

  // Edit mode: reset form when group data changes
  useEffect(() => {
    if (isEdit && group) {
      form.reset({
        name: group.name,
        why: group.why || '',
        description: group.description || '',
        is_completed: group.is_completed,
      })
    }
  }, [isEdit, group, form])

  const currentName = useWatch({ control: form.control, name: 'name' }) ?? ''
  const currentWhy = useWatch({ control: form.control, name: 'why' }) ?? ''

  // is_completed only exists in UpdateGroupSchema (edit mode)
  const formValues = useWatch({ control: form.control })
  const isCompleted =
    isEdit && formValues && 'is_completed' in formValues
      ? (formValues.is_completed as boolean | undefined)
      : undefined

  // Edit mode: don't render if group not found
  if (isEdit && !group) return null

  const handleSubmit = (values: CreateGroupSchema | UpdateGroupSchema) => {
    if (isEdit && groupId) {
      const editValues = values as UpdateGroupSchema
      updateGroup.mutate(
        {
          id: groupId,
          input: {
            ...editValues,
            why: editValues.why || undefined,
            description: editValues.description || undefined,
          },
          goalId,
        },
        { onSuccess: () => onDone() }
      )
    } else {
      const createValues = values as CreateGroupSchema
      createGroup.mutate(
        {
          ...createValues,
          goal_id: goalId,
          why: createValues.why || undefined,
          description: createValues.description || undefined,
        },
        { onSuccess: () => onDone() }
      )
    }
  }

  const handleWhyGenerate = () => {
    aiWhy.generate({
      direction: direction?.statement,
      areaName: goal?.area?.name,
      goalName: goal?.name,
      goalWhy: goal?.why,
      groupName: currentName,
      existingGroups: existingNames,
    })
  }

  const idSuffix = isEdit && groupId ? `-${groupId}` : ''
  const isPending = isEdit ? updateGroup.isPending : createGroup.isPending

  return (
    <InlineFormShell onSubmit={form.handleSubmit(handleSubmit)} mode={mode} title="그룹">
      {/* Group name + sample chips */}
      <div className="space-y-1.5">
        <Label htmlFor={`group-name${idSuffix}`} className="text-xs">
          이름
        </Label>
        <Input
          id={`group-name${idSuffix}`}
          placeholder="예: 기초 체력 만들기, 코테 준비하기"
          autoFocus={!isEdit}
          {...form.register('name')}
        />
        {form.formState.errors.name && (
          <p className="text-xs text-[var(--color-miss)]">{form.formState.errors.name.message}</p>
        )}
        <SampleChips
          items={availableNames}
          selectedValue={currentName}
          onToggle={(val) =>
            form.setValue('name', currentName === val ? '' : val, {
              shouldValidate: true,
            })
          }
        />
      </div>

      {/* Why + sample chips + AI */}
      <div className="space-y-1.5">
        <Label htmlFor={`group-why${idSuffix}`} className="text-xs">
          왜 이걸 먼저? (선택)
        </Label>
        <Input
          id={`group-why${idSuffix}`}
          placeholder="예: 기초가 없으면 다음 그룹이 불가능해서"
          value={currentWhy}
          onChange={(e) => form.setValue('why', e.target.value)}
        />
        <SampleChips
          items={SAMPLE_GROUP_WHYS}
          selectedValue={currentWhy}
          onToggle={(val) => form.setValue('why', currentWhy === val ? '' : val)}
        />
        <AiSuggestionPanel
          triggerLabel="AI 도움받기"
          isLoading={aiWhy.isLoading}
          error={aiWhy.error}
          suggestions={aiWhy.suggestions}
          selectedValue={currentWhy}
          onSelect={(s) => form.setValue('why', s.text)}
          onGenerate={handleWhyGenerate}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`group-desc${idSuffix}`} className="text-xs">
          설명 (선택)
        </Label>
        <Input
          id={`group-desc${idSuffix}`}
          placeholder="이 그룹에서 달성할 것들"
          {...form.register('description')}
        />
      </div>

      {/* Completed toggle (edit mode only) */}
      {isEdit && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={isCompleted ?? false}
              onChange={(e) => form.setValue('is_completed' as never, e.target.checked as never)}
              className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-done)]"
            />
            <span className="text-[var(--color-text-secondary)]">완료됨</span>
          </label>
        </div>
      )}

      <InlineFormActions
        onCancel={onDone}
        isPending={isPending}
        submitLabel={isEdit ? '저장' : undefined}
      />
    </InlineFormShell>
  )
}
