'use client'

import { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Heart,
  ListChecks,
  Circle,
  Check,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  closestCorners,
  DragOverlay,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { PeriodBadge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress'
import { useReorderGroups, useDeleteGroup, useToggleGroupComplete } from '@/queries/use-groups'
import { useAreas } from '@/queries/use-areas'
import { useGoalWithRelations, useGoals, useUpdateGoal, useDeleteGoal } from '@/queries/use-goals'
import { cn } from '@/lib/utils'
import { DragOverlayCard } from '@/components/common'
import { useStandardSensors, DROP_ANIMATION } from '@/lib/dnd/dnd-config'
import { useRoadmapStore, selectInlineMode } from '@/stores/roadmap.store'
import {
  InlineGroupCreate,
  InlineGroupEdit,
  InlineTaskQuickInput,
  InlineDeleteConfirm,
} from '../inline-forms'
import {
  useDeleteConfirm,
  useCrossLinkedTasks,
  useCrossGroupDnd,
  ORPHANS_CONTAINER_ID,
} from '@/features/roadmap/hooks'
import { CrossLinkedTaskSection } from '../shared/cross-linked-task-section'
import { TaskRow } from './task-row'
import { SortableGroupItem } from '@/components/common'
import { TaskList, FlatTaskListWithDnd } from './goal-task-list'
import type { Goal, Task, Group } from '@/types/entities'

/* ── Group complete toggle badge ── */

const GroupCompleteBadge = memo(function GroupCompleteBadge({
  group,
  goalId,
}: {
  group: Group
  goalId: string
}) {
  const toggleComplete = useToggleGroupComplete()

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleComplete.mutate({ id: group.id, goalId, isCompleted: !group.is_completed })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={toggleComplete.isPending}
      title={group.is_completed ? '완료 해제' : '완료로 표시'}
      className={cn(
        'flex-shrink-0 cursor-pointer p-1.5 transition-all hover:scale-110',
        group.is_completed ? 'text-[var(--color-done)]' : 'text-[var(--color-text-tertiary)]',
        toggleComplete.isPending && 'animate-pulse'
      )}
    >
      {group.is_completed ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
    </button>
  )
})

/* ── View mode with inline CRUD ── */

export const GoalExpandedContent = memo(function GoalExpandedContent({
  goal,
  onTaskSelect,
  showDelete,
  onShowDeleteChange,
}: {
  goal: Goal
  onTaskSelect?: (taskId: string) => void
  showDelete: boolean
  onShowDeleteChange: (show: boolean) => void
}) {
  const { tasks } = useGoalWithRelations(goal.id)
  const { data: allAreas } = useAreas()
  const areaMap = useMemo(() => new Map((allAreas ?? []).map((a) => [a.id, a])), [allAreas])
  const serverGroups = useMemo(
    () => [...(goal.groups ?? [])].sort((a, b) => a.sort_order.localeCompare(b.sort_order)),
    [goal.groups]
  )
  // Local state for smooth DnD — prevents bounce on drop
  const [localGroups, setLocalGroups] = useState(serverGroups)
  useEffect(() => {
    setLocalGroups(serverGroups)
  }, [serverGroups])
  const groups = localGroups
  const inlineMode = useRoadmapStore(selectInlineMode)
  const setInlineMode = useRoadmapStore((s) => s.setInlineMode)

  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const deleteGroup = useDeleteGroup()
  const groupDelete = useDeleteConfirm()
  const { crossLinkedByGroup } = useCrossLinkedTasks(goal.id)
  const { data: allGoals = [] } = useGoals()
  const focusGoal = useRoadmapStore((s) => s.focusGoal)

  const reorderGroups = useReorderGroups()

  const sensors = useStandardSensors()

  const completedGroups = useMemo(() => groups.filter((g) => g.is_completed).length, [groups])
  const totalGroups = groups.length
  const visibleTasks = useMemo(() => tasks, [tasks])
  const hasGroups = totalGroups > 0

  // Pre-compute tasks by group
  const tasksByGroup = useMemo(() => {
    const map = new Map<string | null, Task[]>()
    for (const task of visibleTasks) {
      const key = task.group_id ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    }
    return map
  }, [visibleTasks])

  // Task lookup by ID
  const tasksById = useMemo(() => new Map(visibleTasks.map((t) => [t.id, t])), [visibleTasks])

  // Group expand/collapse
  const [groupToggles, setGroupToggles] = useState<Record<string, boolean>>({})

  const expandedGroupIds = useMemo(() => {
    const result = new Set<string>()
    for (const group of groups) {
      const manual = groupToggles[group.id]
      if (manual !== undefined) {
        if (manual) result.add(group.id)
      } else if (!group.is_completed) {
        result.add(group.id)
      }
    }
    return result
  }, [groups, groupToggles])

  const toggleGroupExpanded = (groupId: string) => {
    setGroupToggles((prev) => ({
      ...prev,
      [groupId]: !expandedGroupIds.has(groupId),
    }))
  }

  const clearInline = useCallback(() => setInlineMode(null), [setInlineMode])

  // Auto-expand group and scroll into view when inlineMode targets a group/task
  const contentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!inlineMode || typeof inlineMode !== 'object') return

    let selector: string | null = null
    if (inlineMode.type === 'edit-group') {
      selector = `[data-group-id="${inlineMode.groupId}"]`
    } else if (inlineMode.type === 'edit-task') {
      selector = `[data-task-id="${inlineMode.taskId}"]`
      // Auto-expand the parent group so the task is visible
      const task = tasksById.get(inlineMode.taskId)
      if (task?.group_id) {
        setGroupToggles((prev) => ({ ...prev, [task.group_id!]: true }))
      }
    }

    if (!selector) return
    // Wait for render (animation/expand) then scroll
    const timer = setTimeout(() => {
      const el = contentRef.current?.querySelector(selector)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 250)
    return () => clearTimeout(timer)
  }, [inlineMode, tasksById])

  // ── Cross-group DnD (extracted hook) ──

  const {
    taskContainers,
    activeTask,
    orphanedTaskIds,
    handleTaskDragStart,
    handleTaskDragOver,
    handleTaskDragEnd,
    handleTaskDragCancel,
    reorderTasks,
  } = useCrossGroupDnd({
    goalId: goal.id,
    groups,
    tasksByGroup,
    tasksById,
    expandedGroupIds,
    onExpandGroup: (groupId) => setGroupToggles((prev) => ({ ...prev, [groupId]: true })),
    onDragStart: clearInline,
  })

  // ── Group DnD handler ──

  const handleGroupDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = groups.findIndex((g) => g.id === active.id)
        const newIndex = groups.findIndex((g) => g.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return
        setLocalGroups((prev) => arrayMove(prev, oldIndex, newIndex))
        const newIds = arrayMove(
          groups.map((g) => g.id),
          oldIndex,
          newIndex
        )
        reorderGroups.mutate({ goalId: goal.id, ids: newIds })
      }
    },
    [groups, goal.id, reorderGroups]
  )

  const handleTaskClick = (taskId: string) => {
    if (onTaskSelect) {
      onTaskSelect(taskId)
    } else {
      // Toggle: close if already editing this task, open otherwise
      const isAlreadyEditing =
        inlineMode !== null &&
        typeof inlineMode === 'object' &&
        inlineMode.type === 'edit-task' &&
        inlineMode.taskId === taskId
      setInlineMode(isAlreadyEditing ? null : { type: 'edit-task', taskId })
    }
  }

  return (
    <div ref={contentRef} className="space-y-4 border-t border-[var(--color-border)] px-4 py-4">
      {/* Why */}
      {goal.why && (
        <div className="rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-3 py-2.5">
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-[var(--color-primary-500)] uppercase">
            <Heart className="h-3 w-3" />왜 중요한가요?
          </span>
          <p className="ml-[18px] text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {goal.why}
          </p>
        </div>
      )}

      {/* Period */}
      {(goal.start_date || goal.target_date) && (
        <div className="flex items-center gap-1.5 px-1">
          <PeriodBadge startDate={goal.start_date} targetDate={goal.target_date} compact={false} />
        </div>
      )}

      {/* Group Progress */}
      {totalGroups > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[var(--color-text-secondary)] uppercase">
              <Circle className="h-3.5 w-3.5 text-[var(--color-primary-500)]" />
              그룹 현황
            </h4>
            <span className="text-xs">
              {completedGroups}/{totalGroups}
            </span>
          </div>
          <ProgressBar value={completedGroups} max={totalGroups} />
        </div>
      )}

      {/* Structure: Groups ON/OFF */}
      <div>
        {/* Section header */}
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[var(--color-text-secondary)] uppercase">
            <ListChecks className="h-3.5 w-3.5 text-[var(--color-primary-500)]" />
            {hasGroups ? '그룹 · 할 일' : '할 일'}
          </h4>
          {hasGroups && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInlineMode('create-group')}
              className="h-7 gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              그룹
            </Button>
          )}
        </div>

        {!hasGroups ? (
          /* ── Groups OFF: flat task list ── */
          <>
            {visibleTasks.length > 0 && (
              <FlatTaskListWithDnd
                tasks={visibleTasks}
                areaMap={areaMap}
                goalId={goal.id}
                inlineMode={inlineMode}
                onTaskClick={handleTaskClick}
                clearInline={clearInline}
                sensors={sensors}
                reorderTasks={reorderTasks}
              />
            )}

            <InlineTaskQuickInput goalId={goal.id} />

            {/* Cross-linked tasks (flat) */}
            <CrossLinkedTaskSection
              crossLinkedTasks={crossLinkedByGroup.get(null)}
              goalId={goal.id}
              goalAreaId={goal.area_id}
              allGoals={allGoals}
              onNavigate={(sourceGoalId) => focusGoal(sourceGoalId)}
            />
          </>
        ) : (
          /* ── Groups ON: group structure with cross-group DnD ── */
          <>
            {/* Inline Group Create */}
            <AnimatePresence>
              {inlineMode === 'create-group' && (
                <div className="mb-2">
                  <InlineGroupCreate goalId={goal.id} onDone={clearInline} />
                </div>
              )}
            </AnimatePresence>

            {/* Group Sections (outer: group reorder, inner: task cross-group DnD) */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleGroupDragEnd}
            >
              <SortableContext
                items={groups.map((g) => g.id)}
                strategy={verticalListSortingStrategy}
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleTaskDragStart}
                  onDragOver={handleTaskDragOver}
                  onDragEnd={handleTaskDragEnd}
                  onDragCancel={handleTaskDragCancel}
                >
                  <div className="space-y-3">
                    {groups.map((group) => {
                      const containerTaskIds = taskContainers[group.id] ?? []
                      const isGroupExpanded = expandedGroupIds.has(group.id)
                      const isEditingGroup =
                        inlineMode !== null &&
                        typeof inlineMode === 'object' &&
                        inlineMode.type === 'edit-group' &&
                        inlineMode.groupId === group.id
                      return (
                        <SortableGroupItem key={group.id} id={group.id}>
                          {(dragHandleProps) => (
                            <div
                              data-group-id={group.id}
                              className={cn(
                                'overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)]',
                                group.is_completed && 'opacity-60'
                              )}
                            >
                              {/* Group Edit (replaces entire block) */}
                              <AnimatePresence>
                                {isEditingGroup && (
                                  <InlineGroupEdit
                                    goalId={goal.id}
                                    groupId={group.id}
                                    onDone={clearInline}
                                  />
                                )}
                              </AnimatePresence>

                              {!isEditingGroup && (
                                <>
                                  {/* Group Header — entire row is drag handle */}
                                  <div
                                    ref={dragHandleProps.setActivatorRef}
                                    {...dragHandleProps.attributes}
                                    {...dragHandleProps.listeners}
                                    className="group/grp flex cursor-grab items-center rounded-md bg-[var(--color-bg-tertiary)] transition-colors hover:bg-[var(--color-bg-canvas)] active:cursor-grabbing"
                                    style={{ touchAction: 'none' }}
                                  >
                                    <button
                                      className="flex-shrink-0 cursor-pointer p-2 pr-0"
                                      onClick={() => toggleGroupExpanded(group.id)}
                                      aria-expanded={isGroupExpanded}
                                    >
                                      {isGroupExpanded ? (
                                        <ChevronDown className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                                      )}
                                    </button>
                                    <GroupCompleteBadge group={group} goalId={goal.id} />
                                    <button
                                      className="min-w-0 flex-1 cursor-pointer py-2 text-left"
                                      onClick={() => toggleGroupExpanded(group.id)}
                                      aria-expanded={isGroupExpanded}
                                    >
                                      <span
                                        className={cn(
                                          'block truncate text-sm font-semibold',
                                          group.is_completed &&
                                            'text-[var(--color-text-tertiary)] line-through'
                                        )}
                                      >
                                        {group.name}
                                      </span>
                                      {group.why && (
                                        <span className="block truncate text-xs text-[var(--color-text-tertiary)] italic">
                                          {group.why}
                                        </span>
                                      )}
                                    </button>
                                    <div className="flex items-center gap-1.5 pr-2">
                                      <span className="rounded-full bg-[var(--color-bg-canvas)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
                                        {containerTaskIds.length}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setInlineMode({ type: 'edit-group', groupId: group.id })
                                        }}
                                        title="수정"
                                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-all hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/grp:opacity-100"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          groupDelete.toggleDelete(group.id)
                                        }}
                                        title="삭제"
                                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[var(--color-miss)] transition-all hover:bg-[var(--color-bg-tertiary)] lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/grp:opacity-100"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
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
                                            { id: group.id, goalId: goal.id },
                                            { onSuccess: groupDelete.clearDelete }
                                          )
                                        }}
                                        isLoading={deleteGroup.isPending}
                                      />
                                    )}
                                  </AnimatePresence>

                                  {/* Expandable Task List */}
                                  <AnimatePresence initial={false}>
                                    {isGroupExpanded && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-3 py-2">
                                          <TaskList
                                            containerId={group.id}
                                            taskIds={containerTaskIds}
                                            tasksById={tasksById}
                                            areaMap={areaMap}
                                            goalId={goal.id}
                                            inlineMode={inlineMode}
                                            onTaskClick={handleTaskClick}
                                            clearInline={clearInline}
                                          />

                                          {/* Quick task input */}
                                          <InlineTaskQuickInput
                                            goalId={goal.id}
                                            groupId={group.id}
                                          />

                                          {/* Cross-linked tasks in this group */}
                                          <CrossLinkedTaskSection
                                            crossLinkedTasks={crossLinkedByGroup.get(group.id)}
                                            goalId={goal.id}
                                            goalAreaId={goal.area_id}
                                            allGoals={allGoals}
                                            onNavigate={(sourceGoalId) => focusGoal(sourceGoalId)}
                                          />
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </>
                              )}
                            </div>
                          )}
                        </SortableGroupItem>
                      )
                    })}
                  </div>

                  {/* Orphaned tasks (no group_id) — only show when orphans exist */}
                  {orphanedTaskIds.length > 0 && (
                    <TaskList
                      containerId={ORPHANS_CONTAINER_ID}
                      taskIds={orphanedTaskIds}
                      tasksById={tasksById}
                      areaMap={areaMap}
                      goalId={goal.id}
                      inlineMode={inlineMode}
                      onTaskClick={handleTaskClick}
                      clearInline={clearInline}
                    />
                  )}

                  {/* Ungrouped cross-linked tasks (shown in orphaned area) */}
                  <CrossLinkedTaskSection
                    crossLinkedTasks={crossLinkedByGroup.get(null)}
                    goalId={goal.id}
                    goalAreaId={goal.area_id}
                    allGoals={allGoals}
                    onNavigate={(sourceGoalId) => focusGoal(sourceGoalId)}
                  />

                  {/* DragOverlay */}
                  <DragOverlay dropAnimation={DROP_ANIMATION}>
                    {activeTask ? (
                      <DragOverlayCard>
                        <TaskRow
                          task={activeTask}
                          areaMap={areaMap}
                          goalId={goal.id}
                          onEdit={() => {}}
                          onDelete={() => {}}
                          onStatusChange={() => {}}
                        />
                      </DragOverlayCard>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      {/* Goal Delete Confirm */}
      <AnimatePresence>
        {showDelete && (
          <div className="border-t border-[var(--color-border)] pt-3">
            <InlineDeleteConfirm
              title="이 목표를 삭제할까요?"
              description="연결된 그룹과 할 일도 함께 삭제됩니다. 삭제 대신 일시 정지로 기록을 보존할 수도 있어요."
              onCancel={() => onShowDeleteChange(false)}
              onConfirm={() => deleteGoal.mutate(goal.id)}
              isLoading={deleteGoal.isPending}
              alternativeAction={{
                label: '일시 정지로 변경',
                onAction: () => {
                  updateGoal.mutate(
                    { id: goal.id, input: { status: 'paused' }, previousStatus: goal.status },
                    { onSuccess: () => onShowDeleteChange(false) }
                  )
                },
                isLoading: updateGoal.isPending,
              }}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
})
