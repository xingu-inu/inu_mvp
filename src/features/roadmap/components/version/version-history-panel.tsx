'use client'

import { useState } from 'react'
import { Calendar, ChevronDown, ChevronRight, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ResponsiveModal } from '@/components/ui/responsive-modal'
import { AnimatedCollapse } from '../shared/animated-collapse'
import { useDirectionHistory, useArchivedRoadmap } from '@/queries/use-direction'
import { useRoadmapStore } from '@/stores/roadmap.store'
import { GOAL_STATUS_CONFIG } from '@/lib/goal-status'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { DirectionHistoryItem, ArchivedRoadmapData, GoalStatus } from '@/types/entities'

export function VersionHistoryPanel() {
  const isOpen = useRoadmapStore((s) => s.isVersionHistoryOpen)
  const setIsOpen = useRoadmapStore((s) => s.setIsVersionHistoryOpen)
  const setRestoreSourceDirectionId = useRoadmapStore((s) => s.setRestoreSourceDirectionId)
  const setDeleteTargetDirectionId = useRoadmapStore((s) => s.setDeleteTargetDirectionId)

  const { data: history = [], isLoading } = useDirectionHistory()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleRestoreFrom = (directionId: string) => {
    setIsOpen(false)
    setRestoreSourceDirectionId(directionId)
  }

  const handleDelete = (directionId: string) => {
    setIsOpen(false)
    setDeleteTargetDirectionId(directionId)
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={setIsOpen}
      title="로드맵 기록"
      description="나의 로드맵 변천사"
    >
      <div className="space-y-3 p-1">
        {isLoading && (
          <p className="py-8 text-center text-sm text-[var(--color-text-tertiary)]">
            불러오는 중...
          </p>
        )}

        {!isLoading && history.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-text-tertiary)]">
            아직 기록이 없습니다
          </p>
        )}

        {history.map((version) => (
          <VersionCard
            key={version.id}
            version={version}
            isExpanded={expandedId === version.id}
            onToggle={() => toggleExpand(version.id)}
            onRestore={() => handleRestoreFrom(version.id)}
            onDelete={() => handleDelete(version.id)}
          />
        ))}
      </div>
    </ResponsiveModal>
  )
}

// ---------------------------------------------------------------------------
// VersionCard
// ---------------------------------------------------------------------------

function VersionCard({
  version,
  isExpanded,
  onToggle,
  onRestore,
  onDelete,
}: {
  version: DirectionHistoryItem
  isExpanded: boolean
  onToggle: () => void
  onRestore: () => void
  onDelete: () => void
}) {
  const isArchived = version.status === 'archived'

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        !isArchived
          ? 'border-[var(--color-primary-500)]/30 bg-[var(--color-primary-500)]/5'
          : 'border-[var(--color-border)] bg-[var(--color-bg-primary)]'
      } ${isArchived ? 'cursor-pointer' : ''}`}
      onClick={isArchived ? onToggle : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">v{version.version}</span>
            {version.name && (
              <span className="truncate text-xs text-[var(--color-text-secondary)]">
                {version.name}
              </span>
            )}
            {!isArchived && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                현재
              </span>
            )}
          </div>

          <p className="mt-1 text-sm">{version.statement}</p>

          {version.why && (
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)] italic">
              &ldquo;{version.why}&rdquo;
            </p>
          )}

          <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(version.createdAt)}
              {version.archivedAt && ` ~ ${formatDate(version.archivedAt)}`}
            </span>
            <span>{version.areaCount}개 영역</span>
            <span>{version.goalCount}개 목표</span>
          </div>
        </div>

        {isArchived && (
          <ChevronDown
            className={`mt-1 ml-2 h-4 w-4 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </div>

      {/* Inline expanded content */}
      <AnimatePresence initial={false}>
        {isExpanded && isArchived && (
          <AnimatedCollapse duration={0.2}>
            <ExpandedContent directionId={version.id} />
          </AnimatedCollapse>
        )}
      </AnimatePresence>

      {/* Actions */}
      {isArchived && (
        <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={onRestore}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />이 로드맵에서 이어가기
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ExpandedContent — lazy-fetches archived roadmap data
// ---------------------------------------------------------------------------

function ExpandedContent({ directionId }: { directionId: string }) {
  const { data: roadmap, isLoading } = useArchivedRoadmap(directionId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-tertiary)]" />
        <span className="ml-2 text-xs text-[var(--color-text-tertiary)]">불러오는 중...</span>
      </div>
    )
  }

  if (!roadmap) return null

  return (
    <div className="mt-3 space-y-3 border-t border-[var(--color-border)] pt-3">
      {roadmap.areas.map((area) => {
        const areaGoals = roadmap.goals.filter((g) => g.areaId === area.id)
        if (areaGoals.length === 0) return null

        return <AreaSection key={area.id} area={area} goals={areaGoals} />
      })}

      {roadmap.areas.length === 0 && (
        <p className="py-3 text-center text-xs text-[var(--color-text-tertiary)]">
          영역이 없습니다
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AreaSection
// ---------------------------------------------------------------------------

function AreaSection({
  area,
  goals,
}: {
  area: ArchivedRoadmapData['areas'][number]
  goals: ArchivedRoadmapData['goals']
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{area.emoji}</span>
        <span className="text-xs font-medium">{area.name}</span>
        <span className="text-[10px] text-[var(--color-text-tertiary)]">{goals.length}개 목표</span>
      </div>
      <div className="space-y-1 pl-5">
        {goals.map((goal) => (
          <GoalRow key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GoalRow
// ---------------------------------------------------------------------------

function GoalRow({ goal }: { goal: ArchivedRoadmapData['goals'][number] }) {
  const statusConfig = GOAL_STATUS_CONFIG[goal.status as GoalStatus]
  const [isOpen, setIsOpen] = useState(false)

  // Group tasks by group (tasks may be undefined if migration not yet applied)
  const tasks = goal.tasks ?? []
  const ungroupedTasks = tasks.filter((t) => !t.groupId)
  const groupedTasks = goal.groups.map((group) => ({
    ...group,
    tasks: tasks.filter((t) => t.groupId === group.id),
  }))

  const hasTasks = tasks.length > 0

  return (
    <div className="rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2">
      <div
        className={`flex items-center justify-between gap-2 ${hasTasks ? 'cursor-pointer' : ''}`}
        onClick={hasTasks ? () => setIsOpen((p) => !p) : undefined}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {hasTasks && (
            <ChevronRight
              className={`h-3 w-3 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-150 ${
                isOpen ? 'rotate-90' : ''
              }`}
            />
          )}
          <p className="min-w-0 truncate text-xs font-medium">{goal.name}</p>
        </div>
        {statusConfig && (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text}`}
          >
            {statusConfig.label}
          </span>
        )}
      </div>
      {goal.why && (
        <p className="mt-0.5 pl-[18px] text-[11px] text-[var(--color-text-tertiary)]">
          &ldquo;{goal.why}&rdquo;
        </p>
      )}
      <div className="mt-1 flex gap-2 pl-[18px] text-[10px] text-[var(--color-text-tertiary)]">
        {goal.groups.length > 0 && <span>{goal.groups.length}개 그룹</span>}
        <span>{goal.taskCount}개 태스크</span>
      </div>

      {/* Task details */}
      <AnimatePresence initial={false}>
        {isOpen && hasTasks && (
          <AnimatedCollapse duration={0.15}>
            <div className="mt-2 space-y-2 border-t border-[var(--color-border)]/50 pt-2 pl-[18px]">
              {/* Grouped tasks */}
              {groupedTasks.map((group) =>
                group.tasks.length > 0 ? (
                  <div key={group.id} className="space-y-1">
                    <p className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-text-secondary)]">
                      {group.isCompleted ? '✓' : '○'} {group.name}
                    </p>
                    <div className="space-y-0.5 pl-3">
                      {group.tasks.map((task) => (
                        <TaskRow key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                ) : null
              )}

              {/* Ungrouped tasks */}
              {ungroupedTasks.length > 0 && (
                <div className="space-y-0.5">
                  {goal.groups.length > 0 && (
                    <p className="text-[10px] font-medium text-[var(--color-text-secondary)]">
                      기타
                    </p>
                  )}
                  {ungroupedTasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </AnimatedCollapse>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TaskRow
// ---------------------------------------------------------------------------

const TIME_SLOT_LABELS: Record<string, string> = {
  dawn: '새벽',
  morning: '오전',
  afternoon: '오후',
  evening: '저녁',
  anytime: '종일',
}

const REPEAT_LABELS: Record<string, string> = {
  daily: '매일',
  weekdays: '평일',
  weekends: '주말',
  weekly: '매주',
  once: '1회',
  custom: '커스텀',
}

function TaskRow({ task }: { task: ArchivedRoadmapData['goals'][number]['tasks'][number] }) {
  const meta: string[] = []
  if (task.repeatType && REPEAT_LABELS[task.repeatType]) {
    meta.push(REPEAT_LABELS[task.repeatType])
  }
  if (task.timeSlot && TIME_SLOT_LABELS[task.timeSlot]) {
    meta.push(TIME_SLOT_LABELS[task.timeSlot])
  }
  if (task.durationMinutes > 0) {
    meta.push(`${task.durationMinutes}분`)
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="text-[var(--color-text-tertiary)]">·</span>
      <span className="min-w-0 truncate">{task.name}</span>
      {meta.length > 0 && (
        <span className="shrink-0 text-[10px] text-[var(--color-text-tertiary)]">
          {meta.join(' · ')}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), 'yyyy.MM.dd', { locale: ko })
  } catch {
    return dateStr
  }
}
