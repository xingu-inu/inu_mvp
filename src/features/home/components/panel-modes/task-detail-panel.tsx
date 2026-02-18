'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { AiChatButton } from '@/components/common/ai-chat-button'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Edit2,
  Heart,
  Link,
  Link2,
  Pause,
  Play,
  SkipForward,
  Trash2,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Chip } from '@/components/ui/chip'
import { StreakBadge } from '@/components/ui/badge'
import { FormSection } from '@/features/roadmap/components/shared/form-section'
import { ScheduleSummary } from '@/features/roadmap/components/shared/schedule-summary'
import { TaskFormFields } from '@/features/roadmap/components/shared/task-form-fields'
import { SampleChips } from '@/features/roadmap/components/shared/sample-chips'
import { TaskPausePopover } from '@/features/roadmap/components/shared/task-pause-popover'
import { CrossAreaPicker } from '@/features/roadmap/components/shared/cross-area-picker'
import { CrossGoalPicker } from '@/features/roadmap/components/shared/cross-goal-picker'
import { TASK_STATUS_MESSAGES } from '@/lib/task-status'
import { ResponsiveModal, ModalBody, ModalFooter } from '@/components/ui/responsive-modal'
import { NewRoundMessage } from '../new-round-message'
import { useHomeStore } from '@/stores/home.store'
import { useHomeState } from '../../hooks/use-home-state'
import { useHomeTasks } from '@/queries/use-home'
import { useDirection } from '@/queries/use-direction'
import { useCheckIn, useUndoCheckIn } from '@/queries/use-checkin'
import { useUpdateTask, useDeleteTask } from '@/queries/use-tasks'
import { useGoals } from '@/queries/use-goals'
import { useAreas } from '@/queries/use-areas'
import { mapApiTasksToEntities } from '@/lib/utils/task-utils'
import { updateTaskSchema, type UpdateTaskSchema } from '@/lib/validations'
import { cn } from '@/lib/utils'
import { generateAiComment } from '@/lib/utils/ai-comments'
import { getWhySuggestions } from '@/lib/utils/why-generator'
import type { AreaType, CheckInStatus, TaskStatus, UpdateTaskInput } from '@/types/entities'

export function TaskDetailPanel() {
  const selectedTaskId = useHomeStore((s) => s.selectedTaskId)
  const clearPanelSelection = useHomeStore((s) => s.clearPanelSelection)
  const { currentDate } = useHomeState()
  const { data: apiTasks = [] } = useHomeTasks(currentDate)
  const { data: directionData } = useDirection()
  const checkIn = useCheckIn()
  const undoCheckIn = useUndoCheckIn()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { data: allGoals = [] } = useGoals()
  const { data: areas = [] } = useAreas()
  const [hasError, setHasError] = useState(false)
  const [aiComment, setAiComment] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const tasks = mapApiTasksToEntities(apiTasks)
  const task = tasks.find((t) => t.id === selectedTaskId)

  const form = useForm<UpdateTaskSchema>({
    resolver: zodResolver(updateTaskSchema),
    values: task
      ? {
          name: task.name,
          why: task.why || '',
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
        }
      : undefined,
  })

  const currentWhy = useWatch({ control: form.control, name: 'why' })
  const watchedRelatedAreaIds = useWatch({ control: form.control, name: 'related_area_ids' })
  const rawRelatedGoalIds = useWatch({ control: form.control, name: 'related_goal_ids' })
  const relatedGoalIds = useMemo(() => rawRelatedGoalIds ?? [], [rawRelatedGoalIds])
  const rawCrossLinkGroupMap = useWatch({ control: form.control, name: 'cross_link_group_map' })
  const crossLinkGroupMap = useMemo(() => rawCrossLinkGroupMap ?? {}, [rawCrossLinkGroupMap])

  // Why suggestions (same as Roadmap)
  const goal = useMemo(
    () => (task?.goal_id ? (allGoals.find((g) => g.id === task.goal_id) ?? null) : null),
    [allGoals, task?.goal_id]
  )
  const goalArea = areas.find((a) => a.id === goal?.area_id)
  const areaType = (goalArea?.type ?? goal?.area?.type ?? 'custom') as AreaType
  const whySuggestions = getWhySuggestions(
    { name: goal?.name ?? '', why: goal?.why },
    { type: areaType }
  )

  // Cross-linked goals with groups (same as Roadmap)
  const crossLinkedGoalsWithGroups = useMemo(() => {
    return relatedGoalIds
      .map((gId: string) => {
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

  // Auto-select first group for newly linked goals
  const prevGoalIdsRef = useRef(relatedGoalIds)
  useEffect(() => {
    const prev = prevGoalIdsRef.current
    prevGoalIdsRef.current = relatedGoalIds

    const newGoalIds = relatedGoalIds.filter((id: string) => !prev.includes(id))
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

  if (!task) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <button
            onClick={clearPanelSelection}
            className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-sm text-[var(--color-text-tertiary)]">할 일을 찾을 수 없어요</p>
        </div>
      </div>
    )
  }

  const status = task.todayCheckIn?.status
  const isReadOnly = false
  const direction = directionData?.statement ?? null

  const handleCheckIn = (newStatus: CheckInStatus) => {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    checkIn.mutate(
      { task_id: task.id, date: dateStr, status: newStatus },
      {
        onSuccess: () => {
          if (newStatus === 'done') {
            const newStreak = task.streak_count + 1
            const newTotal = task.total_completed + 1
            setAiComment(generateAiComment(newStreak, newTotal))
          }
        },
        onError: () => {
          setHasError(true)
          setTimeout(() => setHasError(false), 500)
        },
      }
    )
  }

  const handlePostpone = () => {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    checkIn.mutate({ task_id: task.id, date: dateStr, status: 'skip', note: 'postponed' })
  }

  const handleEditSubmit = (values: UpdateTaskSchema) => {
    // Only send fields that were actually changed (dirty) — same as Roadmap
    const dirtyFields = form.formState.dirtyFields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: Record<string, any> = {}

    for (const key of Object.keys(dirtyFields) as Array<keyof UpdateTaskSchema>) {
      if (dirtyFields[key]) {
        input[key] = values[key]
      }
    }

    // Normalize: empty why → undefined (server treats as null)
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

    // No changes → just close
    if (Object.keys(input).length === 0) {
      setEditModalOpen(false)
      return
    }

    updateTask.mutate(
      { id: task.id, input: input as UpdateTaskInput },
      { onSuccess: () => setEditModalOpen(false) }
    )
  }

  const handleDeleteConfirm = () => {
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        clearPanelSelection()
      },
    })
  }

  const handleDeactivate = () => {
    updateTask.mutate(
      { id: task.id, input: { status: 'paused' } },
      {
        onSuccess: () => {
          setDeleteDialogOpen(false)
          clearPanelSelection()
          const message = TASK_STATUS_MESSAGES.paused
          if (message) toast.success(message)
        },
      }
    )
  }

  const handleTaskStatusChange = (newStatus: TaskStatus, reason?: string, note?: string) => {
    updateTask.mutate(
      {
        id: task.id,
        input: {
          status: newStatus,
          ...(reason ? { status_change_reason: reason } : {}),
          ...(note ? { status_change_note: note } : {}),
        },
      },
      {
        onSuccess: () => {
          const message = TASK_STATUS_MESSAGES[newStatus]
          if (message) toast.success(message)
        },
      }
    )
  }

  return (
    <div className={cn('flex h-full flex-col', hasError && 'animate-shake')}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <button
          onClick={clearPanelSelection}
          className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </button>
        {!isReadOnly && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditModalOpen(true)}
              aria-label="수정"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
              aria-label="삭제"
            >
              <Trash2 className="h-4 w-4 text-[var(--color-miss)]" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Area + Streak */}
        <div className="flex items-center gap-2">
          {task.goal?.area ? (
            <Chip variant="area" emoji={task.goal.area.emoji} color={task.goal.area.color}>
              {task.goal.area.name}
            </Chip>
          ) : (
            <Chip variant="area" emoji="📌">
              일상
            </Chip>
          )}
          <StreakBadge count={task.streak_count} />
          {task.total_completed > 0 && (
            <span className="text-xs text-[var(--color-text-tertiary)]">
              총 {task.total_completed}회
            </span>
          )}
        </div>

        {/* Cross-linked areas */}
        {task.relatedAreas && task.relatedAreas.length > 0 && (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-tertiary)]">
              <Link className="h-3 w-3" />
              다른 영역에도 도움이 돼요
            </p>
            <div className="flex flex-wrap gap-1">
              {task.relatedAreas.map((area) => (
                <Chip key={area.id} variant="area" emoji={area.emoji} color={area.color}>
                  {area.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Cross-linked goals */}
        {task.relatedGoals && task.relatedGoals.length > 0 && (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-tertiary)]">
              🎯 연결된 목표
            </p>
            <div className="flex flex-wrap gap-1">
              {task.relatedGoals.map((goal) => (
                <Chip key={goal.id} variant="area" emoji={goal.area.emoji} color={goal.area.color}>
                  {goal.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Task Name */}
        <h3
          className={cn(
            'text-lg font-semibold text-[var(--color-text-primary)]',
            status === 'done' && 'line-through opacity-60'
          )}
        >
          {task.name}
        </h3>

        {/* Goal & Group context */}
        {(task.group || task.goal) && (
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {task.group?.name && `${task.group.name} · `}
            {task.goal?.name}
          </p>
        )}

        {/* Duration */}
        {task.duration_minutes && (
          <p className="text-sm text-[var(--color-text-tertiary)]">{task.duration_minutes}분</p>
        )}

        {/* Specific time */}
        {task.specific_time && (
          <p className="text-sm text-[var(--color-text-tertiary)]">{task.specific_time}</p>
        )}

        {/* Task Status Controls */}
        {!isReadOnly && (
          <div className="flex flex-wrap gap-2">
            {task.taskStatus === 'active' && (
              <>
                <TaskPausePopover
                  taskName={task.name}
                  onConfirm={(reason, note) => handleTaskStatusChange('paused', reason, note)}
                  trigger={
                    <Button variant="secondary" size="sm" className="gap-1.5">
                      <Pause className="h-3.5 w-3.5" />
                      일시 정지
                    </Button>
                  }
                />
                {task.repeat_type === 'once' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleTaskStatusChange('completed')}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    완료
                  </Button>
                )}
              </>
            )}
            {task.taskStatus === 'paused' && (
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() => handleTaskStatusChange('active')}
              >
                <Play className="h-3.5 w-3.5" />
                다시 시작
              </Button>
            )}
            {task.taskStatus === 'completed' && (
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() => handleTaskStatusChange('active')}
              >
                <Play className="h-3.5 w-3.5" />
                다시 시작
              </Button>
            )}
          </div>
        )}

        {/* Check-in Buttons + Postpone */}
        {!status && !isReadOnly && (
          <div className="space-y-2">
            <div className="flex gap-3">
              <Button
                variant="done"
                className="flex-1 gap-2"
                onClick={() => handleCheckIn('done')}
                disabled={checkIn.isPending}
              >
                <Check className="h-5 w-5" />
                완료
              </Button>
              <Button
                variant="skip"
                className="flex-1 gap-2"
                onClick={() => handleCheckIn('skip')}
                disabled={checkIn.isPending}
              >
                <SkipForward className="h-5 w-5" />
                건너뛰기
              </Button>
            </div>
            <button
              onClick={handlePostpone}
              disabled={checkIn.isPending}
              className={cn(
                'flex items-center gap-1 text-xs transition-colors',
                'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
                checkIn.isPending && 'cursor-not-allowed opacity-50'
              )}
            >
              <ArrowRight className="h-3 w-3" />
              내일로 미루기
            </button>
          </div>
        )}

        {/* Status indicator */}
        {status && (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex flex-1 items-center gap-2 rounded-lg p-3',
                status === 'done' && 'bg-[var(--color-done-bg)] text-[var(--color-done)]',
                status === 'skip' && 'bg-[var(--color-skip-bg)] text-[var(--color-skip)]'
              )}
            >
              {status === 'done' ? (
                <Check className="h-5 w-5" />
              ) : (
                <SkipForward className="h-5 w-5" />
              )}
              <span className="font-medium">{status === 'done' ? '완료' : '건너뜀'}</span>
            </div>
            {!isReadOnly && task.todayCheckIn?.id && task.todayCheckIn.id !== 'optimistic' && (
              <button
                onClick={() =>
                  undoCheckIn.mutate({
                    checkInId: task.todayCheckIn!.id!,
                    taskId: task.id,
                    date: format(currentDate, 'yyyy-MM-dd'),
                  })
                }
                disabled={undoCheckIn.isPending}
                className="flex items-center gap-1 rounded-lg px-3 py-3 text-sm text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)] disabled:opacity-50"
                aria-label="달성 취소"
              >
                <Undo2 className="h-4 w-4" />
                취소
              </button>
            )}
          </div>
        )}

        {/* AI comment after check-in */}
        {status === 'done' && aiComment && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-[var(--color-primary-50)] p-3"
          >
            <p className="flex items-center gap-2 text-sm text-[var(--color-ai)]">
              <span className="text-base">💡</span>
              {aiComment}
            </p>
          </motion.div>
        )}

        {/* AI Chat Entry */}
        {task.goal && (
          <AiChatButton
            context={{
              type: 'task',
              entityId: task.id,
              entityName: task.name,
              goalId: task.goal.id,
              goalName: task.goal.name,
              areaName: task.goal.area?.name,
            }}
          />
        )}

        {/* New Round Message */}
        <NewRoundMessage
          totalCompleted={task.total_completed}
          bestStreak={task.best_streak}
          streakCount={task.streak_count}
        />

        {/* Why Chain */}
        {task.goal && (
          <div className="space-y-2 rounded-lg bg-[var(--color-bg-secondary)] p-3">
            <p className="text-xs font-medium text-[var(--color-text-tertiary)]">Why Chain</p>
            <div className="space-y-1.5 text-sm">
              {task.why && (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-[var(--color-text-tertiary)]">💭</span>
                  <span className="text-[var(--color-text-secondary)]">{task.why}</span>
                </div>
              )}
              {task.group?.why && (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-[var(--color-text-tertiary)]">📍</span>
                  <span className="text-[var(--color-text-secondary)]">
                    {task.group.name}: {task.group.why}
                  </span>
                </div>
              )}
              {task.goal.why && (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-[var(--color-text-tertiary)]">🎯</span>
                  <span className="text-[var(--color-text-secondary)]">
                    {task.goal.name}: {task.goal.why}
                  </span>
                </div>
              )}
              {task.goal.area?.why && (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-[var(--color-text-tertiary)]">
                    {task.goal.area.emoji || '📂'}
                  </span>
                  <span className="text-[var(--color-text-secondary)]">
                    {task.goal.area.name}: {task.goal.area.why}
                  </span>
                </div>
              )}
              {direction && (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-[var(--color-text-tertiary)]">🧭</span>
                  <span className="text-[var(--color-text-secondary)]">{direction}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-[var(--color-bg-secondary)] p-3 text-center">
            <p className="text-lg font-bold text-[var(--color-primary-500)]">{task.streak_count}</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">현재 연속</p>
          </div>
          <div className="rounded-lg bg-[var(--color-bg-secondary)] p-3 text-center">
            <p className="text-lg font-bold text-[var(--color-text-primary)]">{task.best_streak}</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">최고 연속</p>
          </div>
          <div className="rounded-lg bg-[var(--color-bg-secondary)] p-3 text-center">
            <p className="text-lg font-bold text-[var(--color-text-primary)]">
              {task.total_completed}
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)]">총 완료</p>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <ResponsiveModal open={editModalOpen} onOpenChange={setEditModalOpen} title="할 일 수정">
        <div>
          <ModalBody>
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor={`task-name-${task.id}`} className="text-xs">
                  이름
                </Label>
                <Input id={`task-name-${task.id}`} {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-xs text-[var(--color-miss)]">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Schedule — FormSection + TaskFormFields (same as Roadmap) */}
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

              {/* Why / Motivation — FormSection + SampleChips (same as Roadmap) */}
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

              {/* Cross-Linking — FormSection (same as Roadmap) */}
              {goal?.area_id && task.goal_id && (
                <FormSection
                  icon={Link2}
                  label="연결"
                  preview={
                    <span>
                      {(watchedRelatedAreaIds?.length ?? 0) > 0 || relatedGoalIds.length > 0
                        ? `${watchedRelatedAreaIds?.length ?? 0}개 영역 · ${relatedGoalIds.length}개 목표`
                        : '연결 없음'}
                    </span>
                  }
                >
                  <CrossAreaPicker
                    primaryAreaId={goal.area_id}
                    selectedIds={watchedRelatedAreaIds ?? []}
                    onChange={(ids: string[]) =>
                      form.setValue('related_area_ids', ids, { shouldDirty: true })
                    }
                  />
                  <CrossGoalPicker
                    primaryGoalId={task.goal_id}
                    selectedGoalIds={relatedGoalIds}
                    onChange={(ids: string[]) =>
                      form.setValue('related_goal_ids', ids, { shouldDirty: true })
                    }
                    filterByAreaIds={watchedRelatedAreaIds ?? []}
                  />
                  {crossLinkedGoalsWithGroups.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">연결 목표별 그룹 지정</Label>
                      {crossLinkedGoalsWithGroups.map(
                        ({ goal: linkedGoal, groups: linkedGroups }) => (
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
                                      { ...crossLinkGroupMap, [linkedGoal.id]: gr.id },
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
                        )
                      )}
                    </div>
                  )}
                </FormSection>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setEditModalOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              isLoading={updateTask.isPending}
              onClick={form.handleSubmit(handleEditSubmit, () =>
                toast.error('입력값을 확인해주세요.')
              )}
            >
              저장하기
            </Button>
          </ModalFooter>
        </div>
      </ResponsiveModal>

      {/* Delete Confirmation Dialog */}
      <ResponsiveModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="이 할 일을 삭제할까요?"
        description="삭제하면 달성 기록도 함께 삭제됩니다."
      >
        <ModalBody>
          <p className="text-sm text-[var(--color-text-secondary)]">
            삭제 대신 일시 정지하면 기록을 보존할 수 있어요.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" className="flex-1" onClick={handleDeactivate}>
            일시 정지
          </Button>
          <Button
            variant="primary"
            className="flex-1 bg-[var(--color-miss)] hover:bg-[var(--color-miss)]"
            onClick={handleDeleteConfirm}
          >
            삭제하기
          </Button>
        </ModalFooter>
      </ResponsiveModal>
    </div>
  )
}
