'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  ChevronRight,
  List,
  Compass,
  Edit2,
  Plus,
  Trash2,
  Sparkles,
  Stethoscope,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ErrorCard } from '@/components/ui/error-card'
import { PanelLoadingSpinner } from '@/features/roadmap/components/shared/panel-loading-spinner'
import { useGoals } from '@/queries/use-goals'
import { useAreas, useDeleteArea } from '@/queries/use-areas'
import { useDirection } from '@/queries/use-direction'
import { useRoadmapStore, selectStatusFilter, selectSelectedNodeId } from '@/stores/roadmap.store'
import { GOAL_STATUS_CONFIG } from '@/lib/goal-status'
import { GoalAccordionItem } from './goal-accordion-item'
import {
  InlineAreaCreate,
  InlineAreaEdit,
  InlineDirectionEdit,
  InlineDeleteConfirm,
  InlineGoalCreate,
} from '../inline-forms'
import { useDeleteConfirm } from '../../hooks'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Goal, GoalStatus } from '@/types/entities'

interface GoalBrowsePanelProps {
  onGoalSelect?: (goalId: string) => void
  onTaskSelect?: (taskId: string) => void
}

export function GoalBrowsePanel({ onGoalSelect, onTaskSelect }: GoalBrowsePanelProps = {}) {
  const statusFilter = useRoadmapStore(selectStatusFilter)
  const selectedNodeId = useRoadmapStore(selectSelectedNodeId)
  const select = useRoadmapStore((s) => s.select)

  const {
    data: goals = [],
    isLoading: goalsLoading,
    isError: goalsError,
    error: goalsErr,
    refetch: refetchGoals,
  } = useGoals()
  const {
    data: areas = [],
    isLoading: areasLoading,
    isError: areasError,
    error: areasErr,
    refetch: refetchAreas,
  } = useAreas()
  const { data: direction } = useDirection()

  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set())
  const [collapsedAreaIds, setCollapsedAreaIds] = useState<Set<string>>(new Set())
  const [editingDirection, setEditingDirection] = useState(false)
  const [areaDetailId, setAreaDetailId] = useState<string | null>(null)
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [isCreatingArea, setIsCreatingArea] = useState(false)
  const [creatingGoalInAreaId, setCreatingGoalInAreaId] = useState<string | null>(null)
  const setIsBrainDumpOpen = useRoadmapStore((s) => s.setIsBrainDumpOpen)
  const setIsDiagnosisOpen = useRoadmapStore((s) => s.setIsDiagnosisOpen)
  const areaDelete = useDeleteConfirm()

  const deleteArea = useDeleteArea()

  // Refs for scroll-to-goal
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const goalRefsMap = useRef(new Map<string, HTMLDivElement>())

  const setGoalRef = useCallback((goalId: string, el: HTMLDivElement | null) => {
    if (el) {
      goalRefsMap.current.set(goalId, el)
    } else {
      goalRefsMap.current.delete(goalId)
    }
  }, [])

  // Sync: when focusedGoalId or selection changes (from left tree clicks),
  // auto-expand accordion, uncollapse area, and scroll into view.
  // Uses subscribe() to avoid lint set-state-in-effect warning — this IS syncing
  // with an external store (Zustand), which is the intended use case.
  useEffect(() => {
    const unsub = useRoadmapStore.subscribe((state, prevState) => {
      // Handle pending diagnosis actions FIRST (before any early returns)
      const pending = state.pendingDiagnosisAction
      const prevPending = prevState.pendingDiagnosisAction
      if (pending && pending !== prevPending) {
        // Clear immediately to prevent re-processing
        useRoadmapStore.getState().setPendingDiagnosisAction(null)

        // Goal target: add-why or set-deadline → open InlineGoalEdit
        if (
          (pending.type === 'add-why' || pending.type === 'set-deadline') &&
          pending.targetType === 'goal'
        ) {
          setTimeout(() => {
            setEditingGoalId(pending.targetId)
            setExpandedGoalIds((prev) => new Set(prev).add(pending.targetId))
          }, 150)
        }

        // Task target: add-why → open task edit form in expanded content
        if (pending.type === 'add-why' && pending.targetType === 'task') {
          setTimeout(() => {
            useRoadmapStore.getState().setInlineMode({
              type: 'edit-task',
              taskId: pending.targetId,
            })
          }, 200)
        }

        // Area target: add-goal → uncollapse area, show InlineGoalCreate
        if (pending.type === 'add-goal' && pending.targetType === 'area') {
          setCollapsedAreaIds((prev) => {
            const next = new Set(prev)
            next.delete(pending.targetId)
            return next
          })
          setTimeout(() => {
            setCreatingGoalInAreaId(pending.targetId)
          }, 150)
        }
      }

      const focusId = state.focusedGoalId
      const prevFocusId = prevState.focusedGoalId

      // Handle focusGoal changes (from left tree Goal/Group/Task clicks)
      if (focusId && focusId !== prevFocusId) {
        setExpandedGoalIds((prev) => new Set(prev).add(focusId))
        setAreaDetailId(null)
        // Only clear editingGoalId if no pending action is setting it
        if (
          !pending ||
          pending.targetType !== 'goal' ||
          (pending.type !== 'add-why' && pending.type !== 'set-deadline')
        ) {
          setEditingGoalId(null)
        }

        // Un-collapse the parent area
        const goal = goals.find((g) => g.id === focusId)
        if (goal) {
          setCollapsedAreaIds((prev) => {
            const next = new Set(prev)
            next.delete(goal.area_id)
            return next
          })
        }

        // Scroll into view after accordion expansion
        requestAnimationFrame(() => {
          const el = goalRefsMap.current.get(focusId)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        })
        return
      }

      // Handle direction/area node selections (from left tree Direction/Area clicks)
      const sel = state.selection
      const prevSel = prevState.selection
      const selId = sel.type !== 'none' ? sel.id : null
      const prevSelId = prevSel.type !== 'none' ? prevSel.id : null

      if (selId && selId !== prevSelId) {
        if (sel.type === 'direction') {
          setAreaDetailId(null)
          setEditingGoalId(null)
        } else if (sel.type === 'area') {
          setAreaDetailId(selId)
          setEditingAreaId(selId)
          setEditingGoalId(null)
          setCollapsedAreaIds((prev) => {
            const next = new Set(prev)
            next.delete(selId)
            return next
          })
        }
      }
    })
    return unsub
  }, [goals])

  // Auto-scroll to show the goal creation form
  useEffect(() => {
    if (!creatingGoalInAreaId || !scrollContainerRef.current) return

    const timer = setTimeout(() => {
      const container = scrollContainerRef.current
      if (!container) return
      const formEl = container.querySelector(`[data-goal-create="${creatingGoalInAreaId}"]`)
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [creatingGoalInAreaId])

  // Filter goals by status
  const filteredGoals = useMemo(() => {
    if (statusFilter === 'all') return goals
    return goals.filter((g) => g.status === statusFilter)
  }, [goals, statusFilter])

  // Group by area
  const groupedByArea = useMemo(() => {
    const map = new Map<string, Goal[]>()
    for (const goal of filteredGoals) {
      const existing = map.get(goal.area_id) || []
      map.set(goal.area_id, [...existing, goal])
    }
    return map
  }, [filteredGoals])

  // Show all active areas (even without goals)
  const activeAreas = useMemo(() => {
    return areas.filter((a) => a.is_active)
  }, [areas])

  const handleToggleGoal = (goalId: string) => {
    if (expandedGoalIds.has(goalId)) {
      setExpandedGoalIds((prev) => {
        const next = new Set(prev)
        next.delete(goalId)
        return next
      })
      setEditingGoalId(null)
    } else {
      setExpandedGoalIds((prev) => new Set(prev).add(goalId))
      setAreaDetailId(null)
      setEditingGoalId(null)
      select({ type: 'goal', id: goalId })
      onGoalSelect?.(goalId)
    }
  }

  const handleToggleArea = (areaId: string) => {
    setCollapsedAreaIds((prev) => {
      const next = new Set(prev)
      if (next.has(areaId)) {
        next.delete(areaId)
      } else {
        next.add(areaId)
      }
      return next
    })
  }

  const handleEditGoal = (goalId: string) => {
    setEditingGoalId(goalId)
    setExpandedGoalIds((prev) => new Set(prev).add(goalId))
  }

  if (goalsError || areasError) {
    return (
      <div className="p-4">
        <ErrorCard
          error={(goalsErr ?? areasErr) as Error}
          onRetry={() => {
            refetchGoals()
            refetchAreas()
          }}
        />
      </div>
    )
  }

  if (areasLoading) {
    return <PanelLoadingSpinner />
  }

  if (activeAreas.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <div className="space-y-2">
            <List className="mx-auto h-12 w-12 text-[var(--color-text-tertiary)]" />
            <p className="text-[var(--color-text-secondary)]">
              {statusFilter === 'all' ? '아직 목표가 없어요' : '해당 상태의 목표가 없어요'}
            </p>
          </div>
          {statusFilter === 'all' && (
            <div className="w-full">
              <InlineAreaCreate
                existingAreaTypes={areas.filter((a) => a.is_active).map((a) => a.type)}
                onDone={(newAreaId) => {
                  if (newAreaId) {
                    setCollapsedAreaIds((prev) => {
                      const next = new Set(prev)
                      next.delete(newAreaId)
                      return next
                    })
                    // 연속 흐름: 영역 생성 후 자동으로 목표 추가 폼 열기
                    setCreatingGoalInAreaId(newAreaId)
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">로드맵 목록</h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
              {statusFilter !== 'all' ? (
                <FilterBadge
                  status={statusFilter as GoalStatus}
                  count={filteredGoals.length}
                  onClear={() => useRoadmapStore.getState().setStatusFilter('all')}
                />
              ) : (
                <>
                  <span>{filteredGoals.length}개 목표</span>
                  {(() => {
                    const activeCount = filteredGoals.filter((g) => g.status === 'active').length
                    const completedCount = filteredGoals.filter(
                      (g) => g.status === 'completed'
                    ).length
                    const archivedCount = filteredGoals.filter(
                      (g) => g.status === 'archived'
                    ).length
                    return (
                      <>
                        {activeCount > 0 && (
                          <span className="text-[var(--color-primary-500)]">
                            {activeCount} 진행 중
                          </span>
                        )}
                        {completedCount > 0 && (
                          <span className="text-[var(--color-done)]">{completedCount} 완료</span>
                        )}
                        {archivedCount > 0 && (
                          <span className="text-[var(--color-archived)]">
                            {archivedCount} 나중에
                          </span>
                        )}
                      </>
                    )
                  })()}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDiagnosisOpen(true)}
              className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-[var(--color-primary-200)] px-2.5 py-2 text-xs font-medium text-[var(--color-primary-500)] transition-colors hover:bg-[var(--color-primary-50)] active:scale-[0.97]"
            >
              <Stethoscope className="h-3.5 w-3.5" />
              진단
            </button>
            <button
              onClick={() => setIsBrainDumpOpen(true)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-ai)] px-3 py-2 text-xs font-medium text-white shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              쏟아내기
            </button>
          </div>
        </div>
      </div>

      {/* Direction bar — fixed above scroll */}
      {direction && (
        <DirectionBar
          statement={direction.statement}
          why={direction.why}
          directionId={direction.id}
          isEditing={editingDirection}
          onEdit={() => setEditingDirection(true)}
          onDoneEdit={() => setEditingDirection(false)}
        />
      )}

      {/* Scrollable content */}
      <div ref={scrollContainerRef} className="flex-1 space-y-6 overflow-y-auto p-5">
        {goalsLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary-200)] border-t-[var(--color-primary-500)]" />
          </div>
        )}
        {activeAreas.map((area) => {
          const areaGoals = groupedByArea.get(area.id) || []
          const isCollapsed = collapsedAreaIds.has(area.id)
          const isAreaExpanded = areaDetailId === area.id

          return (
            <div key={area.id}>
              {/* Area Header */}
              <div className="group/area mb-2 flex items-center gap-1">
                <button
                  className="flex flex-1 cursor-pointer items-center gap-2 text-left"
                  aria-expanded={!isCollapsed}
                  onClick={() => {
                    handleToggleArea(area.id)
                  }}
                >
                  <motion.span
                    animate={{ rotate: isCollapsed ? 0 : 90 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="inline-flex"
                  >
                    <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                  </motion.span>
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: area.color,
                      boxShadow: `0 0 0 2px color-mix(in srgb, ${area.color} 20%, transparent)`,
                    }}
                  />
                  <span className="text-sm font-semibold">
                    {area.emoji} {area.name}
                  </span>
                  <span className="rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                    {areaGoals.length}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 transition-opacity lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/area:opacity-100"
                  onClick={() => setCreatingGoalInAreaId(area.id)}
                  title="목표 추가"
                >
                  <Plus className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-7 w-7 transition-opacity lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/area:opacity-100',
                    isAreaExpanded &&
                      editingAreaId === area.id &&
                      'bg-[var(--color-bg-tertiary)] lg:[@media(hover:hover)]:opacity-100'
                  )}
                  onClick={() => {
                    if (areaDetailId === area.id && editingAreaId === area.id) {
                      setAreaDetailId(null)
                      setEditingAreaId(null)
                    } else {
                      setAreaDetailId(area.id)
                      setEditingAreaId(area.id)
                      setEditingGoalId(null)
                      select({ type: 'area', id: area.id })
                    }
                  }}
                  title="영역 수정"
                >
                  <Edit2 className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 transition-opacity lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/area:opacity-100"
                  onClick={() => areaDelete.toggleDelete(area.id)}
                  title="영역 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5 text-[var(--color-miss)]" />
                </Button>
              </div>

              {/* Area delete confirmation */}
              <AnimatePresence>
                {areaDelete.isDeleting(area.id) && (
                  <InlineDeleteConfirm
                    title="이 영역을 삭제할까요?"
                    description="하위 목표와 할 일도 함께 삭제돼요."
                    onCancel={() => areaDelete.clearDelete()}
                    onConfirm={() => {
                      deleteArea.mutate(area.id, {
                        onSuccess: () => {
                          toast.success('영역이 삭제되었어요')
                          areaDelete.clearDelete()
                        },
                      })
                    }}
                    isLoading={deleteArea.isPending}
                  />
                )}
              </AnimatePresence>

              {/* Area inline edit */}
              <AnimatePresence initial={false}>
                {isAreaExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <InlineAreaEdit
                      area={area}
                      onDone={() => {
                        setEditingAreaId(null)
                        setAreaDetailId(null)
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Goal Cards */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="space-y-3 pl-3">
                      {areaGoals.map((goal) => (
                        <GoalAccordionItem
                          key={goal.id}
                          ref={(el) => setGoalRef(goal.id, el)}
                          goal={goal}
                          area={area}
                          isExpanded={expandedGoalIds.has(goal.id)}
                          isHighlighted={selectedNodeId === goal.id}
                          isEditing={editingGoalId === goal.id}
                          onToggle={() => handleToggleGoal(goal.id)}
                          onEditGoal={() => handleEditGoal(goal.id)}
                          onSaveEdit={() => setEditingGoalId(null)}
                          onTaskSelect={onTaskSelect}
                        />
                      ))}

                      {creatingGoalInAreaId === area.id ? (
                        <div data-goal-create={area.id}>
                          <InlineGoalCreate
                            areaId={area.id}
                            onDone={(newGoalId) => {
                              setCreatingGoalInAreaId(null)
                              if (newGoalId)
                                setExpandedGoalIds((prev) => new Set(prev).add(newGoalId))
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--color-border)] px-3 py-2.5 text-xs text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
                          onClick={() => setCreatingGoalInAreaId(area.id)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          목표 추가
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {/* Add Area Button / Inline Form */}
        <AnimatePresence>
          {isCreatingArea && (
            <InlineAreaCreate
              existingAreaTypes={areas.filter((a) => a.is_active).map((a) => a.type)}
              onDone={(newAreaId) => {
                setIsCreatingArea(false)
                if (newAreaId) {
                  setCollapsedAreaIds((prev) => {
                    const next = new Set(prev)
                    next.delete(newAreaId)
                    return next
                  })
                  // 연속 흐름: 영역 생성 후 자동으로 목표 추가 폼 열기
                  setCreatingGoalInAreaId(newAreaId)
                }
              }}
            />
          )}
        </AnimatePresence>
        {!isCreatingArea && (
          <button
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--color-border)] px-3 py-3 text-sm text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-secondary)]"
            onClick={() => setIsCreatingArea(true)}
          >
            <Plus className="h-4 w-4" />
            영역 추가
          </button>
        )}
      </div>
    </div>
  )
}

/** Filter badge — shows active filter status with clear button */
function FilterBadge({
  status,
  count,
  onClear,
}: {
  status: GoalStatus
  count: number
  onClear: () => void
}) {
  const config = GOAL_STATUS_CONFIG[status]
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', config.bg, config.text)}>
        {config.label}
      </span>
      <span>{count}개 목표</span>
      <button
        onClick={onClear}
        className="rounded-md px-1 py-0.5 text-[10px] text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]"
      >
        전체 보기
      </button>
    </span>
  )
}

/** Compact Direction bar — always visible, fixed above scroll */
function DirectionBar({
  statement,
  why,
  directionId,
  isEditing,
  onEdit,
  onDoneEdit,
}: {
  statement: string
  why?: string | null
  directionId: string
  isEditing: boolean
  onEdit: () => void
  onDoneEdit: () => void
}) {
  if (isEditing) {
    return (
      <div className="border-b border-[var(--color-border)] bg-[var(--color-primary-50)]/30">
        <InlineDirectionEdit
          directionId={directionId}
          currentStatement={statement}
          currentWhy={why}
          onDone={onDoneEdit}
        />
      </div>
    )
  }

  return (
    <div className="group/direction flex items-start gap-2.5 border-b border-[var(--color-border)] bg-[var(--color-primary-50)]/30 px-4 py-2.5">
      <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-primary-400)]" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm text-[var(--color-text-primary)]">{statement}</p>
        {why && (
          <span className="mt-1 inline-block max-w-full truncate rounded-full bg-[var(--color-primary-100)] px-2 py-0.5 text-xs text-[var(--color-primary-600)]">
            {why}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 transition-opacity lg:[@media(hover:hover)]:opacity-0 lg:[@media(hover:hover)]:group-hover/direction:opacity-100"
        onClick={onEdit}
        title="방향 수정"
      >
        <Edit2 className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
      </Button>
    </div>
  )
}
