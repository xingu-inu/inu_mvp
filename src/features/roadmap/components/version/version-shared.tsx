'use client'

import { useState } from 'react'
import { Calendar, ChevronDown, ChevronRight, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { AnimatedCollapse } from '../shared/animated-collapse'
import { useArchivedRoadmap } from '@/queries/use-direction'
import { GOAL_STATUS_CONFIG } from '@/lib/goal-status'
import { REPEAT_LABELS as REPEAT_LABELS_TYPED } from '@/lib/constants/repeat-labels'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { DirectionHistoryItem, ArchivedRoadmapData, GoalStatus } from '@/types/entities'

// ---------------------------------------------------------------------------
// VersionCard — renders a single version entry (current or archived)
// compact=true: tighter spacing for dropdown, compact=false: roomier for modal
// ---------------------------------------------------------------------------

export function VersionCard({
  version,
  isExpanded,
  onToggle,
  onRestore,
  onDelete,
  compact = false,
}: {
  version: DirectionHistoryItem
  isExpanded: boolean
  onToggle: () => void
  onRestore: () => void
  onDelete: () => void
  compact?: boolean
}) {
  const isArchived = version.status === 'archived'

  return (
    <div
      className={`border transition-colors ${compact ? 'rounded-lg p-3' : 'rounded-xl p-4'} ${
        !isArchived
          ? 'border-[var(--color-primary-500)]/30 bg-[var(--color-primary-500)]/5'
          : `border-[var(--color-border)] bg-[var(--color-bg-primary)] ${compact ? 'hover:bg-[var(--color-bg-secondary)]' : ''}`
      } ${isArchived ? 'cursor-pointer' : ''}`}
      onClick={isArchived ? onToggle : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>
              v{version.version}
            </span>
            {version.name && (
              <span
                className={`truncate text-[var(--color-text-secondary)] ${compact ? 'text-[11px]' : 'text-xs'}`}
              >
                {version.name}
              </span>
            )}
            {!isArchived && (
              <span
                className={`rounded-full bg-green-100 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400 ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}
              >
                현재
              </span>
            )}
          </div>

          <p className={compact ? 'mt-0.5 text-xs' : 'mt-1 text-sm'}>{version.statement}</p>

          {version.why && (
            <p
              className={`text-[var(--color-text-tertiary)] italic ${compact ? 'mt-0.5 text-[11px]' : 'mt-1 text-xs'}`}
            >
              &ldquo;{version.why}&rdquo;
            </p>
          )}

          <div
            className={`flex items-center text-[var(--color-text-tertiary)] ${compact ? 'mt-1.5 gap-2 text-[10px]' : 'mt-2 gap-3 text-xs'}`}
          >
            <span className={`flex items-center ${compact ? 'gap-0.5' : 'gap-1'}`}>
              <Calendar className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
              {formatDate(version.createdAt)}
              {version.archivedAt && ` ~ ${formatDate(version.archivedAt)}`}
            </span>
            <span>{version.areaCount}개 영역</span>
            <span>{version.goalCount}개 목표</span>
          </div>
        </div>

        {isArchived && (
          <ChevronDown
            className={`shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            } ${compact ? 'mt-0.5 ml-2 h-3.5 w-3.5' : 'mt-1 ml-2 h-4 w-4'}`}
          />
        )}
      </div>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isExpanded && isArchived && (
          <AnimatedCollapse duration={0.2}>
            <ExpandedContent directionId={version.id} compact={compact} />
          </AnimatedCollapse>
        )}
      </AnimatePresence>

      {/* Actions */}
      {isArchived && (
        <div
          className={`flex items-center ${compact ? 'mt-2 gap-1' : 'mt-3 gap-2'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            className={compact ? 'h-7 text-xs' : ''}
            onClick={onRestore}
          >
            <RotateCcw className={compact ? 'mr-1 h-3 w-3' : 'mr-1 h-3.5 w-3.5'} />
            {compact ? '이어가기' : '이 로드맵에서 이어가기'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`ml-auto text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 ${compact ? 'h-7' : ''}`}
            onClick={onDelete}
          >
            <Trash2 className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ExpandedContent — lazy-fetches archived roadmap data
// ---------------------------------------------------------------------------

function ExpandedContent({ directionId, compact }: { directionId: string; compact: boolean }) {
  const { data: roadmap, isLoading } = useArchivedRoadmap(directionId)

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${compact ? 'py-4' : 'py-6'}`}>
        <Loader2
          className={`animate-spin text-[var(--color-text-tertiary)] ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`}
        />
        <span
          className={`text-[var(--color-text-tertiary)] ${compact ? 'ml-1.5 text-[11px]' : 'ml-2 text-xs'}`}
        >
          불러오는 중...
        </span>
      </div>
    )
  }

  if (!roadmap) return null

  return (
    <div
      className={`border-t border-[var(--color-border)] ${compact ? 'mt-2 space-y-2 pt-2' : 'mt-3 space-y-3 pt-3'}`}
    >
      {roadmap.areas.map((area) => {
        const areaGoals = roadmap.goals.filter((g) => g.areaId === area.id)
        if (areaGoals.length === 0) return null

        return <AreaSection key={area.id} area={area} goals={areaGoals} compact={compact} />
      })}

      {roadmap.areas.length === 0 && (
        <p
          className={`text-center text-[var(--color-text-tertiary)] ${compact ? 'py-2 text-[11px]' : 'py-3 text-xs'}`}
        >
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
  compact,
}: {
  area: ArchivedRoadmapData['areas'][number]
  goals: ArchivedRoadmapData['goals']
  compact: boolean
}) {
  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <div className={compact ? 'flex items-center gap-1' : 'flex items-center gap-1.5'}>
        <span className={compact ? 'text-xs' : 'text-sm'}>{area.emoji}</span>
        <span className={`font-medium ${compact ? 'text-[11px]' : 'text-xs'}`}>{area.name}</span>
        <span className="text-[10px] text-[var(--color-text-tertiary)]">{goals.length}개 목표</span>
      </div>
      <div className={compact ? 'space-y-0.5 pl-4' : 'space-y-1 pl-5'}>
        {goals.map((goal) => (
          <GoalRow key={goal.id} goal={goal} compact={compact} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GoalRow
// ---------------------------------------------------------------------------

function GoalRow({
  goal,
  compact,
}: {
  goal: ArchivedRoadmapData['goals'][number]
  compact: boolean
}) {
  const statusConfig = GOAL_STATUS_CONFIG[goal.status as GoalStatus]
  const [isOpen, setIsOpen] = useState(false)

  const tasks = goal.tasks ?? []
  const ungroupedTasks = tasks.filter((t) => !t.groupId)
  const groupedTasks = goal.groups.map((group) => ({
    ...group,
    tasks: tasks.filter((t) => t.groupId === group.id),
  }))

  const hasTasks = tasks.length > 0

  return (
    <div
      className={`bg-[var(--color-bg-secondary)] ${compact ? 'rounded-md px-2 py-1.5' : 'rounded-lg px-3 py-2'}`}
    >
      <div
        className={`flex items-center justify-between ${compact ? 'gap-1' : 'gap-2'} ${hasTasks ? 'cursor-pointer' : ''}`}
        onClick={hasTasks ? () => setIsOpen((p) => !p) : undefined}
      >
        <div className={`flex min-w-0 items-center ${compact ? 'gap-1' : 'gap-1.5'}`}>
          {hasTasks && (
            <ChevronRight
              className={`shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-150 ${
                isOpen ? 'rotate-90' : ''
              } ${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'}`}
            />
          )}
          <p className={`min-w-0 truncate font-medium ${compact ? 'text-[11px]' : 'text-xs'}`}>
            {goal.name}
          </p>
        </div>
        {statusConfig && (
          <span
            className={`shrink-0 rounded-full font-medium ${statusConfig.bg} ${statusConfig.text} ${compact ? 'px-1 py-0.5 text-[9px]' : 'px-1.5 py-0.5 text-[10px]'}`}
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
            <div
              className={`border-t border-[var(--color-border)]/50 ${compact ? 'mt-1 space-y-1 pt-1 pl-3' : 'mt-2 space-y-2 pt-2 pl-[18px]'}`}
            >
              {groupedTasks.map((group) =>
                group.tasks.length > 0 ? (
                  <div key={group.id} className={compact ? 'space-y-0.5' : 'space-y-1'}>
                    <p className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-text-secondary)]">
                      {group.isCompleted ? '✓' : '○'} {group.name}
                    </p>
                    <div className="space-y-0.5 pl-3">
                      {group.tasks.map((task) => (
                        <TaskRow key={task.id} task={task} compact={compact} />
                      ))}
                    </div>
                  </div>
                ) : null
              )}

              {ungroupedTasks.length > 0 && (
                <div className="space-y-0.5">
                  {goal.groups.length > 0 && (
                    <p className="text-[10px] font-medium text-[var(--color-text-secondary)]">
                      기타
                    </p>
                  )}
                  {ungroupedTasks.map((task) => (
                    <TaskRow key={task.id} task={task} compact={compact} />
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

const REPEAT_LABELS: Record<string, string> = REPEAT_LABELS_TYPED

function TaskRow({
  task,
  compact,
}: {
  task: ArchivedRoadmapData['goals'][number]['tasks'][number]
  compact: boolean
}) {
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
    <div className={`flex items-center ${compact ? 'gap-1 text-[10px]' : 'gap-1.5 text-[11px]'}`}>
      <span className="text-[var(--color-text-tertiary)]">·</span>
      <span className="min-w-0 truncate">{task.name}</span>
      {meta.length > 0 && (
        <span
          className={`shrink-0 text-[var(--color-text-tertiary)] ${compact ? 'text-[9px]' : 'text-[10px]'}`}
        >
          {meta.join(' · ')}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), 'yyyy.MM.dd', { locale: ko })
  } catch {
    return dateStr
  }
}
