'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { AlertTriangle, Sparkles, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ResponsiveModal, ModalFooter } from '@/components/ui/responsive-modal'
import { useArchivedRoadmap, useCreateRoadmapVersion } from '@/queries/use-direction'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { GOAL_STATUS_CONFIG } from '@/lib/goal-status'
import type { GoalStatus } from '@/types/entities'

export function RestoreConfirmDialog() {
  // Store state
  const directionId = useRoadmapStore((s) => s.restoreSourceDirectionId)
  const setRestoreSourceDirectionId = useRoadmapStore((s) => s.setRestoreSourceDirectionId)

  const isOpen = directionId !== null

  // Fetch archived data (will be cached if user already expanded the version card)
  const { data: roadmap, isLoading } = useArchivedRoadmap(directionId)

  // Mutation
  const createVersion = useCreateRoadmapVersion()

  // Local state
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([])
  const [isDirectionEditable, setIsDirectionEditable] = useState(false)
  const [editedStatement, setEditedStatement] = useState('')
  const [editedWhy, setEditedWhy] = useState('')

  // Re-initialize local state when roadmap data changes (avoids setState-in-effect)
  const prevRoadmapIdRef = useRef<string | null>(null)
  const currentRoadmapId = roadmap?.direction.id ?? null
  if (currentRoadmapId !== prevRoadmapIdRef.current) {
    prevRoadmapIdRef.current = currentRoadmapId
    if (roadmap) {
      setSelectedGoalIds(roadmap.goals.map((g) => g.id))
      setEditedStatement(roadmap.direction.statement)
      setEditedWhy(roadmap.direction.why ?? '')
      setIsDirectionEditable(false)
    }
  }

  // Goal toggle
  const toggleGoal = useCallback((goalId: string) => {
    setSelectedGoalIds((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    )
  }, [])

  // Area-level toggle
  const toggleAreaGoals = useCallback(
    (areaGoalIds: string[]) => {
      const allSelected = areaGoalIds.every((id) => selectedGoalIds.includes(id))
      if (allSelected) {
        setSelectedGoalIds((prev) => prev.filter((id) => !areaGoalIds.includes(id)))
      } else {
        setSelectedGoalIds((prev) => [...new Set([...prev, ...areaGoalIds])])
      }
    },
    [selectedGoalIds]
  )

  // Group goals by area
  const goalsByArea = useMemo(() => {
    if (!roadmap) return []
    return roadmap.areas
      .map((area) => ({
        area,
        goals: roadmap.goals.filter((g) => g.areaId === area.id),
      }))
      .filter((group) => group.goals.length > 0)
  }, [roadmap])

  const handleConfirm = async () => {
    if (!roadmap) return
    const statement = isDirectionEditable ? editedStatement.trim() : roadmap.direction.statement
    const why = isDirectionEditable
      ? editedWhy.trim() || undefined
      : (roadmap.direction.why ?? undefined)

    try {
      await createVersion.mutateAsync({
        statement,
        why,
        carryOverGoalIds: selectedGoalIds,
      })
      toast.success('새 로드맵이 시작되었습니다!')
      setRestoreSourceDirectionId(null)
    } catch {
      toast.error('새 로드맵 생성에 실패했습니다.')
    }
  }

  const handleClose = () => setRestoreSourceDirectionId(null)

  const handleOpenChange = (open: boolean) => {
    if (!open) setRestoreSourceDirectionId(null)
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="과거 로드맵에서 이어가기"
      description="선택한 방향과 목표로 새 버전을 만듭니다"
    >
      <div className="space-y-5">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-tertiary)]" />
          </div>
        )}

        {/* Content */}
        {!isLoading && roadmap && (
          <>
            {/* Direction Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">방향</p>
                <button
                  type="button"
                  onClick={() => setIsDirectionEditable((prev) => !prev)}
                  className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
                >
                  <Pencil className="h-3 w-3" />
                  {isDirectionEditable ? '원래대로' : '수정하기'}
                </button>
              </div>

              {isDirectionEditable ? (
                <div className="space-y-2">
                  <textarea
                    value={editedStatement}
                    onChange={(e) => setEditedStatement(e.target.value)}
                    placeholder="방향을 입력하세요"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm outline-none focus:border-[var(--color-primary-500)]"
                    rows={2}
                  />
                  <textarea
                    value={editedWhy}
                    onChange={(e) => setEditedWhy(e.target.value)}
                    placeholder="왜 이 방향인가요? (선택)"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-sm outline-none focus:border-[var(--color-primary-500)]"
                    rows={2}
                  />
                </div>
              ) : (
                <div className="rounded-xl bg-[var(--color-bg-secondary)] p-3">
                  <p className="text-sm leading-relaxed italic">
                    &ldquo;{roadmap.direction.statement}&rdquo;
                  </p>
                  {roadmap.direction.why && (
                    <p className="mt-1.5 text-xs text-[var(--color-text-tertiary)]">
                      {roadmap.direction.why}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Goal Selection Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                  이어갈 목표
                </p>
                <span className="text-xs text-[var(--color-primary-500)]">
                  {selectedGoalIds.length}개 선택됨
                </span>
              </div>

              <div className="max-h-[320px] space-y-3 overflow-y-auto">
                {goalsByArea.map(({ area, goals: areaGoals }) => {
                  const areaGoalIds = areaGoals.map((g) => g.id)
                  const selectedCount = areaGoalIds.filter((id) =>
                    selectedGoalIds.includes(id)
                  ).length
                  const allSelected = selectedCount === areaGoalIds.length
                  const someSelected = selectedCount > 0 && !allSelected

                  return (
                    <div key={area.id}>
                      {/* Area header */}
                      <label className="mb-1.5 flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected
                          }}
                          onChange={() => toggleAreaGoals(areaGoalIds)}
                          className="h-4 w-4 rounded accent-[var(--color-primary-500)]"
                        />
                        <span>{area.emoji}</span>
                        <span className="text-sm font-medium">{area.name}</span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          ({selectedCount}/{areaGoalIds.length})
                        </span>
                      </label>

                      {/* Goals */}
                      <div className="space-y-1 pl-6">
                        {areaGoals.map((goal) => {
                          const isSelected = selectedGoalIds.includes(goal.id)
                          const statusConfig =
                            GOAL_STATUS_CONFIG[goal.status as GoalStatus] ??
                            GOAL_STATUS_CONFIG.backlog

                          return (
                            <label
                              key={goal.id}
                              className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--color-bg-secondary)] ${
                                isSelected ? 'bg-[var(--color-primary-50)]/50' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleGoal(goal.id)}
                                className="h-4 w-4 rounded accent-[var(--color-primary-500)]"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm">{goal.name}</p>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text}`}
                                  >
                                    {statusConfig.label}
                                  </span>
                                  <span className="text-xs text-[var(--color-text-tertiary)]">
                                    {goal.taskCount}개 태스크
                                  </span>
                                </div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Warning banner */}
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-900/10">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    과거 로드맵을 기반으로 새 버전이 생성됩니다
                  </p>
                  <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                    현재 로드맵은 아카이브되며, 기존 기록은 모두 보존됩니다
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <ModalFooter>
          <Button variant="ghost" onClick={handleClose}>
            취소
          </Button>
          <div className="flex-1" />
          <Button onClick={handleConfirm} disabled={createVersion.isPending}>
            <Sparkles className="mr-1 h-4 w-4" />
            {createVersion.isPending ? '생성 중...' : '새 버전으로 시작'}
          </Button>
        </ModalFooter>
      </div>
    </ResponsiveModal>
  )
}
