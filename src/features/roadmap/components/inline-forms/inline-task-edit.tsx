'use client'

import { useMemo, useEffect, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, Heart, Link2 } from 'lucide-react'
import { InlineFormShell } from '@/features/roadmap/components/shared/inline-form-shell'
import { InlineFormActions } from '@/features/roadmap/components/shared/inline-form-actions'
import { FormSection } from '@/features/roadmap/components/shared/form-section'
import { ScheduleSummary } from '@/features/roadmap/components/shared/schedule-summary'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Chip } from '@/components/ui/chip'
import { SampleChips } from '@/features/roadmap/components/shared/sample-chips'
import { useUpdateTask } from '@/queries/use-tasks'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { updateTaskSchema, type UpdateTaskSchema } from '@/lib/validations'
import { getWhySuggestions } from '@/lib/utils/why-generator'
import { TaskFormFields } from '@/features/roadmap/components/shared/task-form-fields'
import { CrossAreaPicker } from '@/features/roadmap/components/shared/cross-area-picker'
import { CrossGoalPicker } from '@/features/roadmap/components/shared/cross-goal-picker'
import type { Task, AreaType } from '@/types/entities'

/** Task fields needed for the edit form */
type TaskForEdit = Pick<
  Task,
  | 'id'
  | 'name'
  | 'why'
  | 'goal_id'
  | 'group_id'
  | 'repeat_type'
  | 'repeat_days'
  | 'duration_minutes'
  | 'time_slot'
  | 'specific_time'
  | 'scheduled_date'
  | 'start_date'
  | 'end_date'
  | 'related_area_ids'
  | 'related_goal_ids'
  | 'cross_link_group_map'
>

interface InlineTaskEditProps {
  task: TaskForEdit
  onDone: () => void
}

export function InlineTaskEdit({ task, onDone }: InlineTaskEditProps) {
  const { data: areas = [] } = useAreas()
  const { data: allGoals = [] } = useGoals()
  const updateTask = useUpdateTask()

  // Find the goal for cross-linking and why suggestions
  const goal = useMemo(
    () => (task.goal_id ? (allGoals.find((g) => g.id === task.goal_id) ?? null) : null),
    [allGoals, task.goal_id]
  )

  // Compute suggestions
  const goalArea = areas.find((a) => a.id === goal?.area_id)
  const areaType = (goalArea?.type ?? goal?.area?.type ?? 'custom') as AreaType
  const whySuggestions = getWhySuggestions(
    { name: goal?.name ?? '', why: goal?.why },
    { type: areaType }
  )

  const form = useForm<UpdateTaskSchema>({
    resolver: zodResolver(updateTaskSchema),
    values: {
      name: task.name,
      why: task.why || '',
      group_id: task.group_id ?? null,
      repeat_type: task.repeat_type,
      repeat_days: task.repeat_days ?? undefined,
      duration_minutes: task.duration_minutes ?? undefined,
      time_slot: task.time_slot ?? undefined,
      specific_time: task.specific_time ?? undefined,
      scheduled_date: task.scheduled_date ?? undefined,
      start_date: task.start_date ?? undefined,
      end_date: task.end_date ?? undefined,
      related_area_ids: task.related_area_ids ?? [],
      related_goal_ids: task.related_goal_ids ?? [],
      cross_link_group_map: task.cross_link_group_map ?? {},
    },
  })

  const currentWhy = useWatch({ control: form.control, name: 'why' })
  const relatedAreaIds = useWatch({ control: form.control, name: 'related_area_ids' }) ?? []
  const rawRelatedGoalIds = useWatch({ control: form.control, name: 'related_goal_ids' })
  const relatedGoalIds = useMemo(() => rawRelatedGoalIds ?? [], [rawRelatedGoalIds])
  const rawCrossLinkGroupMap = useWatch({ control: form.control, name: 'cross_link_group_map' })
  const crossLinkGroupMap = useMemo(() => rawCrossLinkGroupMap ?? {}, [rawCrossLinkGroupMap])

  // Build cross-linked goals with their available groups
  const crossLinkedGoalsWithGroups = useMemo(() => {
    return relatedGoalIds
      .map((gId) => {
        const g = allGoals.find((ag) => ag.id === gId)
        if (!g) return null
        const activeGroups = (g.groups ?? []).filter((gr) => !gr.is_completed)
        if (activeGroups.length === 0) return null
        return { goal: g, groups: activeGroups }
      })
      .filter(Boolean) as Array<{
      goal: (typeof allGoals)[number]
      groups: NonNullable<(typeof allGoals)[number]['groups']>
    }>
  }, [relatedGoalIds, allGoals])

  // Auto-select first group for newly linked goals that have groups
  const prevGoalIdsRef = useRef(relatedGoalIds)
  useEffect(() => {
    const prev = prevGoalIdsRef.current
    prevGoalIdsRef.current = relatedGoalIds

    const newGoalIds = relatedGoalIds.filter((id) => !prev.includes(id))
    if (newGoalIds.length === 0) return

    let updated = false
    const newMap = { ...crossLinkGroupMap }
    for (const gId of newGoalIds) {
      const g = allGoals.find((ag) => ag.id === gId)
      const firstGroup = (g?.groups ?? []).find((gr) => !gr.is_completed)
      if (firstGroup) {
        newMap[gId] = firstGroup.id
        updated = true
      }
    }
    if (updated) {
      form.setValue('cross_link_group_map', newMap, { shouldDirty: true })
    }
  }, [relatedGoalIds, allGoals, crossLinkGroupMap, form])

  const handleSubmit = (values: UpdateTaskSchema) => {
    // Only send fields that were actually changed (dirty)
    const dirtyFields = form.formState.dirtyFields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: Record<string, any> = {}

    for (const key of Object.keys(dirtyFields) as Array<keyof UpdateTaskSchema>) {
      if (dirtyFields[key]) {
        input[key] = values[key]
      }
    }

    // Normalize: empty why → undefined (preserve existing)
    if ('why' in input) {
      input.why = input.why || undefined
    }

    // If cross_link_group_map or related_goal_ids changed, clean the map
    if (input.cross_link_group_map || input.related_goal_ids) {
      const cleanedMap: Record<string, string | null> = {}
      const selectedGoalIds = values.related_goal_ids ?? []
      for (const gId of selectedGoalIds) {
        if (values.cross_link_group_map && gId in values.cross_link_group_map) {
          cleanedMap[gId] = values.cross_link_group_map[gId]
        }
      }
      input.cross_link_group_map = cleanedMap
      input.related_goal_ids = values.related_goal_ids
    }

    // Skip mutation if nothing changed
    if (Object.keys(input).length === 0) {
      onDone()
      return
    }

    updateTask.mutate(
      { id: task.id, input },
      {
        onSuccess: () => onDone(),
        onError: (error) => {
          console.error('[InlineTaskEdit] Update failed:', {
            taskId: task.id,
            input,
            error: error.message,
          })
        },
      }
    )
  }

  return (
    <InlineFormShell onSubmit={form.handleSubmit(handleSubmit)} mode="edit" title="할 일">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor={`task-name-${task.id}`} className="text-xs">
          이름
        </Label>
        <Input id={`task-name-${task.id}`} {...form.register('name')} />
        {form.formState.errors.name && (
          <p className="text-xs text-[var(--color-miss)]">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Schedule */}
      <FormSection
        icon={CalendarDays}
        label="스케줄"
        defaultOpen
        preview={
          <ScheduleSummary
            repeatType={form.watch('repeat_type') ?? 'once'}
            repeatDays={form.watch('repeat_days')}
            scheduledDate={form.watch('scheduled_date')}
            timeSlot={form.watch('time_slot')}
            specificTime={form.watch('specific_time')}
            durationMinutes={form.watch('duration_minutes')}
            startDate={form.watch('start_date')}
            endDate={form.watch('end_date')}
          />
        }
      >
        <TaskFormFields form={form} compact />
      </FormSection>

      {/* Why / Motivation */}
      <FormSection
        icon={Heart}
        label="동기"
        bgClassName="bg-[var(--color-primary-50)]/40"
        preview={<span>{currentWhy || '미설정'}</span>}
      >
        <div className="space-y-1.5">
          <Label htmlFor={`task-why-${task.id}`} className="text-xs">
            왜 이 할 일을? (선택)
          </Label>
          <Input id={`task-why-${task.id}`} {...form.register('why')} />
          <SampleChips
            items={whySuggestions.map((s) => s.text)}
            selectedValue={currentWhy ?? ''}
            onToggle={(val) =>
              form.setValue('why', currentWhy === val ? '' : val, { shouldDirty: true })
            }
          />
        </div>
      </FormSection>

      {/* Cross-Linking (only for goal-linked tasks) */}
      {goal?.area_id && task.goal_id && (
        <FormSection
          icon={Link2}
          label="연결"
          preview={
            <span>
              {relatedAreaIds.length > 0 || relatedGoalIds.length > 0
                ? `${relatedAreaIds.length}개 영역 · ${relatedGoalIds.length}개 목표`
                : '연결 없음'}
            </span>
          }
        >
          {/* Cross-Area Linking */}
          <CrossAreaPicker
            primaryAreaId={goal.area_id}
            selectedIds={relatedAreaIds}
            onChange={(ids: string[]) =>
              form.setValue('related_area_ids', ids, { shouldDirty: true })
            }
          />

          {/* Cross-Goal Linking */}
          <CrossGoalPicker
            primaryGoalId={task.goal_id}
            selectedGoalIds={relatedGoalIds}
            onChange={(ids: string[]) =>
              form.setValue('related_goal_ids', ids, { shouldDirty: true })
            }
            filterByAreaIds={relatedAreaIds}
          />

          {/* Cross-Link Group Selection per linked goal */}
          {crossLinkedGoalsWithGroups.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">연결 목표별 그룹 지정</Label>
              {crossLinkedGoalsWithGroups.map(({ goal: linkedGoal, groups: linkedGroups }) => (
                <div key={linkedGoal.id} className="space-y-1">
                  <span className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
                    {linkedGoal.name}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {linkedGroups.map((gr) => (
                      <Chip
                        key={gr.id}
                        variant="selection"
                        selected={crossLinkGroupMap[linkedGoal.id] === gr.id}
                        onClick={() =>
                          form.setValue(
                            'cross_link_group_map',
                            {
                              ...crossLinkGroupMap,
                              [linkedGoal.id]: gr.id,
                            },
                            { shouldDirty: true }
                          )
                        }
                        className="cursor-pointer text-xs"
                      >
                        {gr.name}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormSection>
      )}

      {/* Actions */}
      <InlineFormActions onCancel={onDone} isPending={updateTask.isPending} submitLabel="저장" />
    </InlineFormShell>
  )
}
