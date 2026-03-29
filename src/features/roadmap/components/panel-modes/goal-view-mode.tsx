'use client'

import { useState, useEffect } from 'react'
import { Plus, Target, Sparkles } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { PanelLoadingSpinner } from '@/features/roadmap/components/shared/panel-loading-spinner'
import { PeriodBadge } from '@/components/ui/badge'
import { ResponsiveModal, ModalBody } from '@/components/ui/responsive-modal'
import { ProgressBar } from '@/components/ui/progress'
import { useGoals, useGoalWithRelations, useUpdateGoal, useDeleteGoal } from '@/queries/use-goals'
import { useEnableGoalGroups, useDisableGoalGroups } from '@/queries/use-groups'
import { useAreas } from '@/queries/use-areas'
import { useDirection } from '@/queries/use-direction'
import { useRoadmapStore, selectGoalId } from '@/stores/roadmap.store'
import { needsTransitionDialog } from '@/lib/goal-status'
import { useAiSuggest } from '@/hooks/use-ai-suggest'
import { InlineDeleteConfirm, InlineGoalEdit } from '../inline-forms'
import { StatusTransitionDialog } from '../status-transition-dialog'
import { GoalCompletionDialog } from '../goal-completion-dialog'
import { useCrossLinkedTasks } from '@/features/roadmap/hooks'
import { useUpdateTask } from '@/queries/use-tasks'
import { CrossLinkTaskPicker } from '../shared/cross-link-task-picker'
import { AiDecomposeSection } from './ai-decompose-section'
import { StatusTransitionSection } from './status-transition-section'
import { GoalViewHeader } from './goal-view-header'
import { GoalDeleteDialog } from './goal-delete-dialog'
import { GoalFlatTasksSection } from './goal-flat-tasks-section'
import { GoalGroupsSection } from './goal-groups-section'
import { ImpactAreaPicker } from './impact-area-picker'
import type { GoalStatus } from '@/types/entities'
import type { AiDecomposeResponse } from '@/lib/ai/types'

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
  const setInlineMode = useRoadmapStore((s) => s.setInlineMode)
  const goalId = propGoalId || storeGoalId

  const { goal, groups, tasks, isLoading } = useGoalWithRelations(goalId || '')
  const { data: direction } = useDirection()

  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const aiSuggest = useAiSuggest()
  const enableGroups = useEnableGoalGroups()
  const disableGroups = useDisableGoalGroups()
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)

  const [aiTarget, setAiTarget] = useState<'decompose' | null>(null)
  const [decomposeData, setDecomposeData] = useState<AiDecomposeResponse | null>(null)
  const [crossLinkPickerOpen, setCrossLinkPickerOpen] = useState(false)
  const { crossLinkedByGroup } = useCrossLinkedTasks(goalId)
  const { data: allGoals } = useGoals()
  const { data: allAreas } = useAreas()
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
      setTransitionDialog({ open: true, type: dialogType, targetStatus: status })
      return
    }

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
      input: { status: 'completed' as GoalStatus, status_change_note: note },
      previousStatus: goal.status,
    })
    setCompletionDialogOpen(false)
  }

  const handleDeleteConfirm = () => {
    if (!goal) return
    deleteGoal.mutate(goal.id, { onSuccess: () => handleClose() })
    setDeleteDialogOpen(false)
  }

  const handleDeletePause = () => {
    if (!goal) return
    updateGoal.mutate({ id: goal.id, input: { status: 'paused' }, previousStatus: goal.status })
    setDeleteDialogOpen(false)
  }

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

  // Derived state
  const completedGroups = groups.filter((g) => g.is_completed).length
  const totalGroups = groups.length
  const activeTasks = tasks.filter((t) => t.is_active)
  const hasGroups = groups.length > 0

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <GoalViewHeader
        goal={goal}
        showBackButton={showBackButton}
        showCloseButton={showCloseButton}
        onBack={onBack}
        onClose={handleClose}
        onEdit={() => setGoalEditOpen(true)}
        onDelete={() => setDeleteDialogOpen(true)}
      />

      {/* Content */}
      <div className="flex-1 space-y-5 overflow-y-auto p-4 pb-8 lg:pb-4">
        {/* Why */}
        {goal.why && (
          <div className="rounded-lg bg-[var(--color-bg-secondary)] px-4 py-3">
            <span className="mb-1 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
              이 목표, 왜 중요한가요?
            </span>
            <p className="leading-relaxed text-[var(--color-text-primary)]">{goal.why}</p>
          </div>
        )}

        {/* Period */}
        {(goal.start_date || goal.target_date) && (
          <div className="px-1">
            <PeriodBadge
              startDate={goal.start_date}
              targetDate={goal.target_date}
              compact={false}
            />
          </div>
        )}

        {/* Impact Areas */}
        {allAreas && allAreas.filter((a) => a.id !== goal.area_id).length > 0 && (
          <ImpactAreaPicker
            areaId={goal.area_id}
            selectedIds={goal.impact_area_ids ?? []}
            areas={allAreas}
            onUpdate={(ids) => updateGoal.mutate({ id: goal.id, input: { impact_area_ids: ids } })}
          />
        )}

        {/* Status Change */}
        <StatusTransitionSection currentStatus={goal.status} onStatusChange={handleStatusChange} />

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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInlineMode('create-group')}
                  className="gap-1"
                >
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

          {/* AI Decompose */}
          <AiDecomposeSection
            isPending={aiSuggest.isPending && aiTarget === 'decompose'}
            error={aiSuggest.error && aiTarget === 'decompose' ? aiSuggest.error : null}
            decomposeData={decomposeData}
            goalId={goalId}
            onComplete={() => setDecomposeData(null)}
            onCancel={() => setDecomposeData(null)}
          />

          {!hasGroups ? (
            <GoalFlatTasksSection
              goalId={goalId}
              goalAreaId={goal.area_id}
              activeTasks={activeTasks}
              crossLinkedTasks={crossLinkedByGroup.get(null)}
              allGoals={allGoals ?? []}
            />
          ) : (
            <GoalGroupsSection
              goalId={goalId}
              goalAreaId={goal.area_id}
              groups={groups}
              activeTasks={activeTasks}
              crossLinkedByGroup={crossLinkedByGroup}
              allGoals={allGoals ?? []}
            />
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
        <GoalDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          onPause={handleDeletePause}
        />
      )}

      {/* Goal Edit Modal */}
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
