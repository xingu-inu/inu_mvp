'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Activity, CalendarDays, Heart, Link2 } from 'lucide-react'
import { InlineFormShell } from '@/features/roadmap/components/shared/inline-form-shell'
import { InlineFormActions } from '@/features/roadmap/components/shared/inline-form-actions'
import { FormSection } from '@/features/roadmap/components/shared/form-section'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Chip } from '@/components/ui/chip'
import { SampleChips } from '@/features/roadmap/components/shared/sample-chips'
import { AiSuggestionPanel } from '@/components/common/ai-suggestion-panel'
import { useUpdateTask } from '@/queries/use-tasks'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { useDirection } from '@/queries/use-direction'
import { useAiWhySuggestions } from '@/hooks/use-ai-why-suggestions'
import { updateTaskSchema, type UpdateTaskSchema } from '@/lib/validations'
import { cn } from '@/lib/utils'
import { getWhySuggestions } from '@/lib/utils/why-generator'
import { TASK_STATUS_CONFIG } from '@/lib/task-status'
import { CrossAreaPicker } from '@/features/roadmap/components/shared/cross-area-picker'
import { CrossGoalPicker } from '@/features/roadmap/components/shared/cross-goal-picker'
import type { Task, AreaType, TaskStatus } from '@/types/entities'

/** Task fields needed for the edit form */
type TaskForEdit = Pick<
  Task,
  | 'id'
  | 'name'
  | 'why'
  | 'goal_id'
  | 'group_id'
  | 'start_date'
  | 'end_date'
  | 'related_area_ids'
  | 'related_goal_ids'
  | 'cross_link_group_map'
  | 'status'
>

interface InlineTaskEditProps {
  task: TaskForEdit
  onDone: () => void
}

export function InlineTaskEdit({ task, onDone }: InlineTaskEditProps) {
  const { data: areas = [] } = useAreas()
  const { data: allGoals = [] } = useGoals()
  const { data: direction } = useDirection()
  const updateTask = useUpdateTask()
  const aiWhy = useAiWhySuggestions({ target: 'task-why' })

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
      status: task.status,
      start_date: task.start_date ?? undefined,
      end_date: task.end_date ?? undefined,
      related_area_ids: task.related_area_ids ?? [],
      related_goal_ids: task.related_goal_ids ?? [],
      cross_link_group_map: task.cross_link_group_map ?? {},
    },
  })

  const currentWhy = useWatch({ control: form.control, name: 'why' })
  const watchedStartDate = useWatch({ control: form.control, name: 'start_date' })
  const watchedEndDate = useWatch({ control: form.control, name: 'end_date' })
  const watchedStatus = useWatch({ control: form.control, name: 'status' })
  const relatedAreaIds = useWatch({ control: form.control, name: 'related_area_ids' }) ?? []
  const rawRelatedGoalIds = useWatch({ control: form.control, name: 'related_goal_ids' })
  const relatedGoalIds = useMemo(() => rawRelatedGoalIds ?? [], [rawRelatedGoalIds])
  const rawCrossLinkGroupMap = useWatch({ control: form.control, name: 'cross_link_group_map' })
  const crossLinkGroupMap = useMemo(() => rawCrossLinkGroupMap ?? {}, [rawCrossLinkGroupMap])

  const currentStatus: TaskStatus = (watchedStatus ?? task.status) as TaskStatus
  const [whyFocused, setWhyFocused] = useState(false)

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

      {/* Period — inline one-row layout */}
      <div>
        <span className="flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
          <CalendarDays className="h-3 w-3" />
          기간
        </span>
        <div className="mt-2 flex items-center gap-2">
          <DatePicker
            value={watchedStartDate ?? null}
            onChange={(d) => form.setValue('start_date', d ?? null, { shouldDirty: true })}
            compact
            placeholder="시작 날짜"
            className="min-w-0 flex-1"
          />
          <span className="shrink-0 text-xs text-[var(--color-text-tertiary)]">~</span>
          {watchedEndDate ? (
            <DatePicker
              value={watchedEndDate}
              onChange={(d) => form.setValue('end_date', d ?? null, { shouldDirty: true })}
              compact
              placeholder="종료 날짜"
              className="min-w-0 flex-1"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                const defaultEnd = format(
                  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                  'yyyy-MM-dd'
                )
                form.setValue('end_date', defaultEnd, { shouldDirty: true })
              }}
              className="inline-flex h-8 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-xs text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-border-hover)]"
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              계속
            </button>
          )}
        </div>
      </div>

      {/* Why / Motivation — inline with preset chips on focus */}
      <div>
        <span className="flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
          <Heart className="h-3 w-3" />
          동기
        </span>
        <div
          className="mt-2 space-y-1.5 rounded-lg bg-[var(--color-primary-50)]/40 px-3 py-2.5"
          onFocus={() => setWhyFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setWhyFocused(false)
          }}
        >
          <Input
            id={`task-why-${task.id}`}
            {...form.register('why')}
            placeholder="왜 이 할 일을? (선택)"
          />
          {whyFocused && (
            <>
              <SampleChips
                items={whySuggestions.map((s) => s.text)}
                selectedValue={currentWhy ?? ''}
                onToggle={(val) =>
                  form.setValue('why', currentWhy === val ? '' : val, { shouldDirty: true })
                }
                preventBlur
              />
              <AiSuggestionPanel
                triggerLabel="AI 추천받기"
                isLoading={aiWhy.isLoading}
                error={aiWhy.error}
                suggestions={aiWhy.suggestions}
                selectedValue={currentWhy ?? ''}
                onSelect={(s) => form.setValue('why', s.text, { shouldDirty: true })}
                onGenerate={() =>
                  aiWhy.generate({
                    direction: direction?.statement,
                    areaName: goalArea?.name,
                    goalName: goal?.name,
                  })
                }
              />
            </>
          )}
        </div>
      </div>

      {/* Cross-Linking — always visible (only for goal-linked tasks) */}
      {goal?.area_id && task.goal_id && (
        <div>
          <span className="flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
            <Link2 className="h-3 w-3" />
            연결
          </span>
          <div className="mt-2 space-y-3 rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2.5">
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
          </div>
        </div>
      )}

      {/* Status — 달성 여부 */}
      <FormSection
        icon={Activity}
        label="달성 여부"
        defaultOpen
        preview={<span>{TASK_STATUS_CONFIG[currentStatus].label}</span>}
      >
        <div className="flex gap-2">
          {(['active', 'paused', 'completed'] as TaskStatus[]).map((s) => {
            const cfg = TASK_STATUS_CONFIG[s]
            const isSelected = currentStatus === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => form.setValue('status', s, { shouldDirty: true })}
                className={cn(
                  'flex-1 rounded-lg border-2 py-2 text-xs font-medium transition-all',
                  isSelected
                    ? `${cfg.border} ${cfg.bg} ${cfg.text}`
                    : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                )}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </FormSection>

      {/* Actions */}
      <InlineFormActions onCancel={onDone} isPending={updateTask.isPending} submitLabel="저장" />
    </InlineFormShell>
  )
}
