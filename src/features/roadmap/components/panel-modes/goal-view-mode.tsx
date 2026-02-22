'use client'

import { memo, useState, useEffect, useCallback } from 'react'
import {
  Trash2,
  Plus,
  Target,
  X,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Circle,
  CheckCircle2,
  Link,
  Link2Off,
  Calendar1,
  Repeat,
  Stethoscope,
  Pencil,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { PanelLoadingSpinner } from '@/features/roadmap/components/shared/panel-loading-spinner'
import { Chip } from '@/components/ui/chip'
import { DDayBadge } from '@/components/ui/badge'
import { ResponsiveModal, ModalBody, ModalFooter } from '@/components/ui/responsive-modal'
import { ProgressBar } from '@/components/ui/progress'
import { useGoals, useGoalWithRelations, useUpdateGoal, useDeleteGoal } from '@/queries/use-goals'
import { useDeleteGroup, useEnableGoalGroups, useDisableGoalGroups } from '@/queries/use-groups'
import { useDirection } from '@/queries/use-direction'
import { useRoadmapStore, selectGoalId, selectInlineMode } from '@/stores/roadmap.store'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_OPTIONS, needsTransitionDialog } from '@/lib/goal-status'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import { AiDecomposePreview } from '../ai-decompose-preview'
import {
  InlineTaskQuickInput,
  InlineGroupCreate,
  InlineGroupEdit,
  InlineDeleteConfirm,
  InlineGoalEdit,
} from '../inline-forms'
import { GoalTaskItem } from '../shared/goal-task-item'
import { StatusTransitionDialog } from '../status-transition-dialog'
import { GoalCompletionDialog } from '../goal-completion-dialog'
import { useDeleteConfirm, useCrossLinkedTasks } from '@/features/roadmap/hooks'
import { computeUnlinkUpdates } from '@/lib/utils/task-utils'
import { useUpdateTask } from '@/queries/use-tasks'
import { CrossLinkTaskPicker } from '../shared/cross-link-task-picker'
import type { GoalStatus, Task } from '@/types/entities'
import type { AiDecomposeResponse } from '@/lib/ai/types'

const CrossLinkedTaskRow = memo(function CrossLinkedTaskRow({
  task,
  sourceGoalId: _sourceGoalId,
  sourceGoalName,
  sourceAreaEmoji,
  sourceAreaColor,
  onUnlink,
  onNavigate,
}: {
  task: Task
  sourceGoalId: string
  sourceGoalName: string
  sourceAreaEmoji: string
  sourceAreaColor: string
  onUnlink: () => void
  onNavigate: () => void
}) {
  const RepeatIcon = task.repeat_type === 'once' ? Calendar1 : Repeat
  return (
    <div
      className="group/cross flex cursor-pointer items-center rounded-md border-l-2 border-dashed bg-[var(--color-bg-secondary)]/30 transition-colors hover:bg-[var(--color-bg-secondary)]"
      style={{ borderLeftColor: sourceAreaColor || 'var(--color-border)' }}
      onClick={onNavigate}
    >
      <div className="flex flex-1 flex-col px-2.5 py-1.5">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Link className="h-3 w-3 shrink-0 text-[var(--color-text-tertiary)]" />
            <RepeatIcon className="h-3 w-3 shrink-0 text-[var(--color-text-tertiary)]" />
            <span className="flex-1 truncate text-xs font-medium">{task.name}</span>
          </div>
          {task.streak_count > 0 && (
            <span className="shrink-0 text-[10px] text-[var(--color-streak)]">
              🔥 {task.streak_count}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1 pl-[30px]">
          <p className="truncate text-[10px] text-[var(--color-text-tertiary)]">
            ← {sourceAreaEmoji} {sourceGoalName}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center pr-1.5 lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/cross:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onUnlink()
          }}
          title="연결 해제"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-miss)]"
        >
          <Link2Off className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
})

interface GoalViewModeProps {
  goalId?: string
  onClose?: () => void
  showCloseButton?: boolean
  showBackButton?: boolean
  onBack?: () => void
}

export function GoalViewMode({
  goalId: propGoalId,
  onClose,
  showCloseButton = true,
  showBackButton = false,
  onBack,
}: GoalViewModeProps) {
  const storeGoalId = useRoadmapStore(selectGoalId)
  const inlineMode = useRoadmapStore(selectInlineMode)
  const setInlineMode = useRoadmapStore((s) => s.setInlineMode)
  const goalId = propGoalId || storeGoalId

  const { goal, groups, tasks, isLoading } = useGoalWithRelations(goalId || '')
  const { data: direction } = useDirection()

  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const aiSuggest = useAiSuggest()
  const deleteGroup = useDeleteGroup()
  const enableGroups = useEnableGoalGroups()
  const disableGroups = useDisableGoalGroups()
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)

  const [aiTarget, setAiTarget] = useState<'decompose' | null>(null)
  const [decomposeData, setDecomposeData] = useState<AiDecomposeResponse | null>(null)
  const [crossLinkPickerOpen, setCrossLinkPickerOpen] = useState(false)
  const groupDelete = useDeleteConfirm()
  const taskDelete = useDeleteConfirm()
  const { crossLinkedByGroup } = useCrossLinkedTasks(goalId)
  const { data: allGoals } = useGoals()
  const updateTaskForUnlink = useUpdateTask()

  // Reset inline mode when goal changes
  useEffect(() => {
    setInlineMode(null)
  }, [goalId, setInlineMode])

  // Dialog state
  const [transitionDialog, setTransitionDialog] = useState<{
    open: boolean
    type: 'pause'
    targetStatus: GoalStatus
  }>({ open: false, type: 'pause', targetStatus: 'paused' })
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [goalEditOpen, setGoalEditOpen] = useState(false)

  const handleClose = () => {
    useRoadmapStore.getState().clearSelection()
    onClose?.()
  }

  const handleStatusChange = (status: GoalStatus) => {
    if (!goal) return

    const dialogType = needsTransitionDialog(goal.status, status)

    if (dialogType === 'complete') {
      setCompletionDialogOpen(true)
      return
    }

    if (dialogType === 'pause') {
      setTransitionDialog({
        open: true,
        type: dialogType,
        targetStatus: status,
      })
      return
    }

    // Direct transition (e.g. backlog→active)
    updateGoal.mutate({ id: goal.id, input: { status }, previousStatus: goal.status })
  }

  const handleTransitionConfirm = (reason?: string, note?: string) => {
    if (!goal) return
    updateGoal.mutate({
      id: goal.id,
      input: {
        status: transitionDialog.targetStatus,
        status_change_reason: reason,
        status_change_note: note,
      },
      previousStatus: goal.status,
    })
    setTransitionDialog((prev) => ({ ...prev, open: false }))
  }

  const handleCompletionConfirm = (choice: 'archive' | 'next-level', note?: string) => {
    if (!goal) return
    updateGoal.mutate({
      id: goal.id,
      input: {
        status: 'completed' as GoalStatus,
        status_change_note: note,
      },
      previousStatus: goal.status,
    })
    setCompletionDialogOpen(false)
  }

  const handleDelete = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!goal) return
    deleteGoal.mutate(goal.id, {
      onSuccess: () => handleClose(),
    })
    setDeleteDialogOpen(false)
  }

  const handleDeletePause = () => {
    if (!goal) return
    updateGoal.mutate({ id: goal.id, input: { status: 'paused' }, previousStatus: goal.status })
    setDeleteDialogOpen(false)
  }

  const handleGroupClick = useCallback(
    (groupId: string) => {
      setInlineMode({ type: 'edit-group', groupId })
    },
    [setInlineMode]
  )

  const handleAddGroup = () => {
    setInlineMode('create-group')
  }

  const handleTaskClick = useCallback(
    (taskId: string) => {
      setInlineMode({ type: 'edit-task', taskId })
    },
    [setInlineMode]
  )

  const handleDecompose = () => {
    if (!goal) return
    setAiTarget('decompose')
    setDecomposeData(null)
    aiSuggest.mutate(
      {
        type: 'decompose',
        context: {
          direction: direction?.statement,
          areaName: goal.area?.name,
          goalName: goal.name,
          goalWhy: goal.why,
          existingGroups: groups.map((g) => g.name),
          existingTasks: tasks.map((t) => t.name),
        },
        decomposeTarget: 'both',
      },
      {
        onSuccess: (data) => {
          setDecomposeData(data as AiDecomposeResponse)
        },
      }
    )
  }

  // No goal selected
  if (!goalId) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <Target className="mx-auto h-12 w-12 text-[var(--color-text-tertiary)]" />
          <p className="text-[var(--color-text-secondary)]">
            목표를 선택하면 상세 정보가 여기에 표시됩니다
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading || !goal) {
    return <PanelLoadingSpinner />
  }

  // Calculate group progress
  const completedGroups = groups.filter((g) => g.is_completed).length
  const totalGroups = groups.length

  // Calculate task progress
  const activeTasks = tasks.filter((t) => t.is_active)
  const hasGroups = groups.length > 0

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[var(--color-border)] p-4">
        <div className="flex-1">
          {showBackButton && (
            <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2 gap-1">
              <ArrowLeft className="h-4 w-4" />
              뒤로
            </Button>
          )}
          {goal.area && (
            <Chip variant="area" emoji={goal.area.emoji} color={goal.area.color} className="mb-2">
              {goal.area.name}
            </Chip>
          )}
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-[var(--color-primary-500)]" />
            <h2 className="text-xl font-bold">{goal.name}</h2>
            {goal.target_date && <DDayBadge targetDate={goal.target_date} />}
          </div>
        </div>
        <div className="flex gap-1">
          {goal.area && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setGoalEditOpen(true)}
              aria-label="편집"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="삭제">
            <Trash2 className="h-4 w-4 text-[var(--color-miss)]" />
          </Button>
          {showCloseButton && (
            <Button variant="ghost" size="icon" onClick={handleClose} aria-label="닫기">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-5 overflow-y-auto p-4 pb-8 lg:pb-4">
        {/* Why */}
        {goal.why ? (
          <div className="rounded-lg bg-[var(--color-bg-secondary)] px-4 py-3">
            <span className="mb-1 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
              이 목표, 왜 중요한가요?
            </span>
            <p className="leading-relaxed text-[var(--color-text-primary)]">{goal.why}</p>
          </div>
        ) : (
          <div className="w-full rounded-lg border border-dashed border-[var(--color-border)] px-4 py-3 text-left">
            <span className="mb-0.5 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
              이 목표, 왜 중요한가요?
            </span>
            <p className="text-sm text-[var(--color-text-tertiary)]">
              이유를 적어두면 꾸준히 하는 데 도움이 돼요
            </p>
          </div>
        )}

        {/* Status Change */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">상태</h3>
          <div className="flex flex-wrap gap-2">
            {GOAL_STATUS_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                variant="selection"
                selected={goal.status === option.value}
                onClick={() => handleStatusChange(option.value)}
                className="cursor-pointer"
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Group Progress */}
        {totalGroups > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">그룹 현황</h3>
              <span className="text-sm">
                {completedGroups}/{totalGroups}
              </span>
            </div>
            <ProgressBar value={completedGroups} max={totalGroups} />
          </div>
        )}

        {/* Structure: Groups ON/OFF */}
        <div>
          {/* Section header with group toggle */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
                {hasGroups ? '그룹 · 할 일' : '할 일'}
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--color-text-tertiary)]">그룹</span>
                <Switch
                  checked={hasGroups}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      enableGroups.mutate({ goalId: goal.id })
                    } else {
                      setShowDisableConfirm(true)
                    }
                  }}
                  disabled={enableGroups.isPending || disableGroups.isPending}
                  className="h-4 w-7 data-[state=checked]:[&>span]:h-3 data-[state=checked]:[&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3 data-[state=unchecked]:[&>span]:h-3 data-[state=unchecked]:[&>span]:w-3"
                />
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setCrossLinkPickerOpen(true)}
                className="text-xs text-[var(--color-primary-500)] transition-colors hover:text-[var(--color-primary-600)]"
              >
                + 연결
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDecompose}
                disabled={aiSuggest.isPending && aiTarget === 'decompose'}
                className="gap-1 text-[var(--color-primary-500)]"
              >
                <Sparkles className="h-4 w-4" />
                AI로 구성
              </Button>
              {hasGroups && (
                <Button variant="ghost" size="sm" onClick={handleAddGroup} className="gap-1">
                  <Plus className="h-4 w-4" />
                  그룹
                </Button>
              )}
            </div>
          </div>

          {/* Disable groups confirmation */}
          <AnimatePresence>
            {showDisableConfirm && (
              <div className="mb-2">
                <InlineDeleteConfirm
                  title="그룹 관리를 해제할까요?"
                  description="모든 그룹이 삭제되고 할 일은 직접 연결로 변경됩니다."
                  onCancel={() => setShowDisableConfirm(false)}
                  onConfirm={() => {
                    disableGroups.mutate(
                      { goalId: goal.id },
                      { onSuccess: () => setShowDisableConfirm(false) }
                    )
                  }}
                  isLoading={disableGroups.isPending}
                />
              </div>
            )}
          </AnimatePresence>

          {!hasGroups ? (
            /* ── Groups OFF: flat task list ── */
            <>
              {/* AI Decompose Loading */}
              {aiSuggest.isPending && aiTarget === 'decompose' && (
                <div className="space-y-2 py-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 animate-pulse rounded-lg bg-[var(--color-bg-tertiary)]"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              )}

              {/* AI Decompose Error */}
              {aiSuggest.error && aiTarget === 'decompose' && !aiSuggest.isPending && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--color-miss)]/10 px-3 py-2 text-sm text-[var(--color-miss)]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{aiSuggest.error.message}</span>
                </div>
              )}

              {/* AI Decompose Preview */}
              <AnimatePresence>
                {decomposeData?.groups && decomposeData.groups.length > 0 && (
                  <AiDecomposePreview
                    goalId={goalId!}
                    groups={decomposeData.groups}
                    onComplete={() => setDecomposeData(null)}
                    onCancel={() => setDecomposeData(null)}
                  />
                )}
              </AnimatePresence>

              {/* Flat task list */}
              {activeTasks.length > 0 && (
                <div className="space-y-1">
                  {activeTasks.map((task) => {
                    const isEditingTask =
                      inlineMode !== null &&
                      typeof inlineMode === 'object' &&
                      inlineMode.type === 'edit-task' &&
                      inlineMode.taskId === task.id

                    return (
                      <GoalTaskItem
                        key={task.id}
                        task={task}
                        isEditing={isEditingTask}
                        isDeleting={taskDelete.isDeleting(task.id)}
                        onEdit={() => handleTaskClick(task.id)}
                        onEditDone={() => setInlineMode(null)}
                        onDeleteToggle={() => taskDelete.toggleDelete(task.id)}
                        onDeleteClear={taskDelete.clearDelete}
                        variant="flat"
                      />
                    )
                  })}
                </div>
              )}

              <InlineTaskQuickInput goalId={goal.id} />

              {/* Cross-linked tasks (flat / no groups) */}
              {(crossLinkedByGroup.get(null) ?? []).length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {(crossLinkedByGroup.get(null) ?? []).map(
                    ({ task, sourceGoalId, sourceGoalName, sourceAreaEmoji, sourceAreaColor }) => (
                      <CrossLinkedTaskRow
                        key={task.id}
                        task={task}
                        sourceGoalId={sourceGoalId}
                        sourceGoalName={sourceGoalName}
                        sourceAreaEmoji={sourceAreaEmoji}
                        sourceAreaColor={sourceAreaColor}
                        onUnlink={() => {
                          const updates = computeUnlinkUpdates({
                            relatedGoalIds: task.related_goal_ids ?? [],
                            relatedAreaIds: task.related_area_ids ?? [],
                            crossLinkGroupMap: task.cross_link_group_map ?? {},
                            unlinkGoalId: goalId!,
                            unlinkGoalAreaId: goal!.area_id,
                            allGoals: allGoals ?? [],
                          })
                          updateTaskForUnlink.mutate({ id: task.id, input: updates })
                        }}
                        onNavigate={() => {
                          useRoadmapStore.getState().select({ type: 'goal', id: sourceGoalId })
                        }}
                      />
                    )
                  )}
                </div>
              )}
            </>
          ) : (
            /* ── Groups ON: group structure with tasks ── */
            <>
              {/* AI Decompose Loading */}
              {aiSuggest.isPending && aiTarget === 'decompose' && (
                <div className="space-y-2 py-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 animate-pulse rounded-lg bg-[var(--color-bg-tertiary)]"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              )}

              {/* AI Decompose Error */}
              {aiSuggest.error && aiTarget === 'decompose' && !aiSuggest.isPending && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--color-miss)]/10 px-3 py-2 text-sm text-[var(--color-miss)]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{aiSuggest.error.message}</span>
                </div>
              )}

              {/* AI Decompose Preview */}
              <AnimatePresence>
                {decomposeData?.groups && decomposeData.groups.length > 0 && (
                  <AiDecomposePreview
                    goalId={goalId!}
                    groups={decomposeData.groups}
                    onComplete={() => setDecomposeData(null)}
                    onCancel={() => setDecomposeData(null)}
                  />
                )}
              </AnimatePresence>

              {/* Inline Group Create */}
              <AnimatePresence>
                {inlineMode === 'create-group' && (
                  <div className="mb-2">
                    <InlineGroupCreate goalId={goalId!} onDone={() => setInlineMode(null)} />
                  </div>
                )}
              </AnimatePresence>

              {/* Group Sections */}
              <div className="space-y-3">
                {groups.map((group) => {
                  // Backward compat: merge orphaned direct tasks into first non-completed group
                  const ownTasks = activeTasks.filter((t) => t.group_id === group.id)
                  const groupTasks = !group.is_completed
                    ? [...ownTasks, ...activeTasks.filter((t) => !t.group_id)]
                    : ownTasks
                  const isEditingGroup =
                    inlineMode !== null &&
                    typeof inlineMode === 'object' &&
                    inlineMode.type === 'edit-group' &&
                    inlineMode.groupId === group.id
                  return (
                    <div key={group.id}>
                      {/* Group edit inline */}
                      <AnimatePresence>
                        {isEditingGroup && (
                          <InlineGroupEdit
                            goalId={goalId!}
                            groupId={group.id}
                            onDone={() => setInlineMode(null)}
                          />
                        )}
                      </AnimatePresence>

                      {!isEditingGroup && (
                        <>
                          {/* Group header */}
                          <div className="group/grp flex items-center gap-1">
                            <button
                              className="flex flex-1 items-center justify-between rounded-lg bg-[var(--color-bg-secondary)] p-3 transition-colors hover:bg-[var(--color-bg-tertiary)]"
                              onClick={() => handleGroupClick(group.id)}
                            >
                              <div className="flex items-center gap-3">
                                {group.is_completed ? (
                                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-done)]" />
                                ) : (
                                  <Circle className="h-5 w-5 shrink-0 text-[var(--color-primary-500)]" />
                                )}
                                <span
                                  className={cn(
                                    group.is_completed &&
                                      'text-[var(--color-text-tertiary)] line-through'
                                  )}
                                >
                                  {group.name}
                                </span>
                              </div>
                            </button>
                            <button
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-miss)] transition-opacity hover:bg-[var(--color-bg-tertiary)] lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/grp:opacity-100"
                              onClick={() => groupDelete.toggleDelete(group.id)}
                              title="그룹 삭제"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          {/* Group delete confirmation */}
                          <AnimatePresence>
                            {groupDelete.isDeleting(group.id) && (
                              <InlineDeleteConfirm
                                title="이 그룹을 삭제할까요?"
                                description="그룹에 포함된 할 일은 삭제되지 않아요."
                                onCancel={groupDelete.clearDelete}
                                onConfirm={() => {
                                  deleteGroup.mutate(
                                    { id: group.id, goalId: goalId! },
                                    { onSuccess: groupDelete.clearDelete }
                                  )
                                }}
                                isLoading={deleteGroup.isPending}
                              />
                            )}
                          </AnimatePresence>
                          {/* Nested tasks under this group */}
                          {groupTasks.length > 0 && (
                            <div className="mt-1 ml-4 space-y-1 border-l-2 border-[var(--color-border)] pl-3">
                              {groupTasks.map((task) => {
                                const isEditingTask =
                                  inlineMode !== null &&
                                  typeof inlineMode === 'object' &&
                                  inlineMode.type === 'edit-task' &&
                                  inlineMode.taskId === task.id

                                return (
                                  <GoalTaskItem
                                    key={task.id}
                                    task={task}
                                    isEditing={isEditingTask}
                                    isDeleting={taskDelete.isDeleting(task.id)}
                                    onEdit={() => handleTaskClick(task.id)}
                                    onEditDone={() => setInlineMode(null)}
                                    onDeleteToggle={() => taskDelete.toggleDelete(task.id)}
                                    onDeleteClear={taskDelete.clearDelete}
                                    variant="nested"
                                  />
                                )
                              })}
                            </div>
                          )}
                          {/* Quick task input (hidden for completed groups) */}
                          {!group.is_completed && (
                            <div className="ml-4">
                              <InlineTaskQuickInput goalId={goal.id} groupId={group.id} />
                            </div>
                          )}
                          {/* Cross-linked tasks for this group */}
                          {(crossLinkedByGroup.get(group.id) ?? []).length > 0 && (
                            <div className="mt-1 ml-4 space-y-0.5 border-l-2 border-dashed border-[var(--color-border)] pl-3">
                              {(crossLinkedByGroup.get(group.id) ?? []).map(
                                ({
                                  task,
                                  sourceGoalId,
                                  sourceGoalName,
                                  sourceAreaEmoji,
                                  sourceAreaColor,
                                }) => (
                                  <CrossLinkedTaskRow
                                    key={task.id}
                                    task={task}
                                    sourceGoalId={sourceGoalId}
                                    sourceGoalName={sourceGoalName}
                                    sourceAreaEmoji={sourceAreaEmoji}
                                    sourceAreaColor={sourceAreaColor}
                                    onUnlink={() => {
                                      const updates = computeUnlinkUpdates({
                                        relatedGoalIds: task.related_goal_ids ?? [],
                                        relatedAreaIds: task.related_area_ids ?? [],
                                        crossLinkGroupMap: task.cross_link_group_map ?? {},
                                        unlinkGoalId: goalId!,
                                        unlinkGoalAreaId: goal!.area_id,
                                        allGoals: allGoals ?? [],
                                      })
                                      updateTaskForUnlink.mutate({ id: task.id, input: updates })
                                    }}
                                    onNavigate={() => {
                                      useRoadmapStore
                                        .getState()
                                        .select({ type: 'goal', id: sourceGoalId })
                                    }}
                                  />
                                )
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Orphaned cross-linked tasks (no group assigned) */}
              {(crossLinkedByGroup.get(null) ?? []).length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {(crossLinkedByGroup.get(null) ?? []).map(
                    ({ task, sourceGoalId, sourceGoalName, sourceAreaEmoji, sourceAreaColor }) => (
                      <CrossLinkedTaskRow
                        key={task.id}
                        task={task}
                        sourceGoalId={sourceGoalId}
                        sourceGoalName={sourceGoalName}
                        sourceAreaEmoji={sourceAreaEmoji}
                        sourceAreaColor={sourceAreaColor}
                        onUnlink={() => {
                          const updates = computeUnlinkUpdates({
                            relatedGoalIds: task.related_goal_ids ?? [],
                            relatedAreaIds: task.related_area_ids ?? [],
                            crossLinkGroupMap: task.cross_link_group_map ?? {},
                            unlinkGoalId: goalId!,
                            unlinkGoalAreaId: goal!.area_id,
                            allGoals: allGoals ?? [],
                          })
                          updateTaskForUnlink.mutate({ id: task.id, input: updates })
                        }}
                        onNavigate={() => {
                          useRoadmapStore.getState().select({ type: 'goal', id: sourceGoalId })
                        }}
                      />
                    )
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* CrossLinkTaskPicker Modal */}
        {goalId && (
          <CrossLinkTaskPicker
            open={crossLinkPickerOpen}
            onOpenChange={setCrossLinkPickerOpen}
            currentGoalId={goalId}
            groups={(goal?.groups ?? [])
              .filter((g) => !g.is_completed)
              .map((g) => ({ id: g.id, name: g.name }))}
            onLink={(taskIds: string[], targetGroupId: string | null) => {
              for (const taskId of taskIds) {
                if (!allGoals) continue
                for (const g of allGoals) {
                  const t = g.tasks?.find((task) => task.id === taskId)
                  if (t) {
                    const existing = t.related_goal_ids ?? []
                    const existingGroupMap = t.cross_link_group_map ?? {}
                    if (!existing.includes(goalId)) {
                      updateTaskForUnlink.mutate({
                        id: taskId,
                        input: {
                          related_goal_ids: [...existing, goalId],
                          cross_link_group_map: { ...existingGroupMap, [goalId]: targetGroupId },
                        },
                      })
                    }
                    break
                  }
                }
              }
            }}
          />
        )}

        {/* AI Diagnosis Button */}
        <div>
          <button
            onClick={() => useRoadmapStore.getState().openDiagnosis('goal', goalId)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--color-primary-200)] px-3 py-2.5 text-xs font-medium text-[var(--color-primary-500)] transition-colors hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)]"
          >
            <Stethoscope className="h-3.5 w-3.5" />이 목표 진단받기
          </button>
        </div>
      </div>

      {/* Status Transition Dialog (pause/backlog) */}
      {goal && (
        <StatusTransitionDialog
          open={transitionDialog.open}
          onOpenChange={(open) => setTransitionDialog((prev) => ({ ...prev, open }))}
          goalName={goal.name}
          transitionType={transitionDialog.type}
          onConfirm={handleTransitionConfirm}
        />
      )}

      {/* Goal Completion Dialog */}
      {goal && (
        <GoalCompletionDialog
          open={completionDialogOpen}
          onOpenChange={setCompletionDialogOpen}
          goalName={goal.name}
          areaId={goal.area_id}
          onComplete={handleCompletionConfirm}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {goal && (
        <ResponsiveModal
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="이 목표를 삭제할까요?"
          description="연결된 그룹과 할 일도 함께 삭제됩니다."
        >
          <ModalBody>
            <p className="text-sm text-[var(--color-text-secondary)]">
              삭제 대신 &quot;일시정지&quot;로 기록을 보존할 수도 있어요.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" className="flex-1" onClick={handleDeletePause}>
              일시정지로 변경
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
      )}

      {/* Goal Edit Modal (dialog on desktop, drawer on mobile) */}
      {goal && goal.area && (
        <ResponsiveModal open={goalEditOpen} onOpenChange={setGoalEditOpen} title="목표 편집">
          <ModalBody className="px-4 pb-6">
            <InlineGoalEdit goal={goal} area={goal.area} onDone={() => setGoalEditOpen(false)} />
          </ModalBody>
        </ResponsiveModal>
      )}
    </div>
  )
}
