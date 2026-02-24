'use client'

import { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { differenceInDays, format, parseISO } from 'date-fns'
import { ChevronDown, ChevronRight, FolderOpen } from 'lucide-react'
import { useReviewStore } from '@/stores/review.store'
import { StreakBadge } from '@/components/ui/badge'
import { WhyCard } from '../why-card'
import { STATUS_STYLES, STATUS_LABELS } from '@/lib/constants/goal-status'
import { CompletionBar } from '@/components/common/completion-bar'
import type { GoalStatus } from '@/types/entities'
import type {
  AreaReviewData,
  GoalReviewData,
  TaskReviewSummary,
} from '../../hooks/use-review-roadmap-data'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AreaBalanceDetailProps {
  areaId: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getAreaStats(areaData: AreaReviewData): {
  completionRate: number
  totalDone: number
  totalScheduled: number
  activeGoals: number
  activeTasks: number
} {
  const activeGoals = areaData.goals.filter((g) => g.goal.status === 'active').length
  let activeTasks = 0
  let totalDone = 0
  let totalScheduled = 0

  for (const goalData of areaData.goals) {
    for (const task of goalData.tasks) {
      if (task.isCrossLinked) continue
      if (task.isActive) {
        activeTasks++
        totalDone += task.totalDone
        totalScheduled += task.totalScheduled
      }
    }
  }

  return {
    completionRate: areaData.periodCompletionRate,
    totalDone,
    totalScheduled,
    activeGoals,
    activeTasks,
  }
}

function getGroupedTasks(tasks: TaskReviewSummary[], groupId: string | null): TaskReviewSummary[] {
  return tasks.filter((t) => t.groupId === groupId && t.isActive && !t.isCrossLinked)
}

function getGoalDateLabel(createdAt: string, status: GoalStatus): string {
  const created = parseISO(createdAt)
  const dateStr = format(created, 'M월 d일')
  const elapsed = differenceInDays(new Date(), created)

  switch (status) {
    case 'active':
    case 'maintenance':
      return `${dateStr} 시작 · ${elapsed}일째`
    case 'completed':
      return `${dateStr} 시작 · 완료`
    case 'paused':
      return `${dateStr} 시작 · 일시정지`
    case 'backlog':
      return `${dateStr} 생성`
    case 'archived':
      return `${dateStr} 시작 · 아카이브`
    default:
      return `${dateStr} 생성`
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CompactTaskRow({ task }: { task: TaskReviewSummary }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-primary)]">
        {task.taskName}
      </span>
      <span className="shrink-0 font-mono text-xs text-[var(--color-text-secondary)]">
        {Math.round(task.completionRate)}%
      </span>
      {task.streakCount > 0 && <StreakBadge count={task.streakCount} />}
    </div>
  )
}

function GoalAccordionContent({ goalData }: { goalData: GoalReviewData }) {
  const sortedGroups = useMemo(
    () => [...goalData.groups].sort((a, b) => a.sortOrder.localeCompare(b.sortOrder)),
    [goalData.groups]
  )

  const ungroupedTasks = useMemo(() => getGroupedTasks(goalData.tasks, null), [goalData.tasks])

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="pt-1 pb-2 pl-4">
        {/* Group sections */}
        {sortedGroups.map((group) => {
          const tasks = getGroupedTasks(goalData.tasks, group.id)
          return (
            <div key={group.id} className="mt-2">
              <div className="flex items-center gap-1.5 py-0.5">
                <FolderOpen className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {group.name}
                </span>
                {group.is_completed && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">&#10003;</span>
                )}
              </div>
              <div className="border-l border-[var(--color-border)] pl-3">
                {tasks.length > 0 ? (
                  tasks.map((task) => <CompactTaskRow key={task.taskId} task={task} />)
                ) : (
                  <p className="py-1 text-xs text-[var(--color-text-tertiary)]">활성 Task 없음</p>
                )}
              </div>
            </div>
          )
        })}

        {/* Ungrouped tasks */}
        {ungroupedTasks.length > 0 && (
          <div className="mt-2">
            {sortedGroups.length > 0 && (
              <span className="text-xs text-[var(--color-text-tertiary)]">기타</span>
            )}
            <div
              className={
                sortedGroups.length > 0 ? 'border-l border-[var(--color-border)] pl-3' : ''
              }
            >
              {ungroupedTasks.map((task) => (
                <CompactTaskRow key={task.taskId} task={task} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function GoalAccordionRow({
  goalData,
  isExpanded,
  onToggle,
  onDrillDown,
}: {
  goalData: GoalReviewData
  isExpanded: boolean
  onToggle: () => void
  onDrillDown: () => void
}) {
  const { goal, periodCompletionRate } = goalData

  return (
    <div className="rounded-lg bg-[var(--color-bg-card)]">
      {/* Goal header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 p-0.5 text-[var(--color-text-tertiary)]"
          aria-label={isExpanded ? '접기' : '펼치기'}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={onDrillDown}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="text-sm">&#127919;</span>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-[var(--color-text-primary)]">
              {goal.name}
            </span>
            <span className="block text-xs text-[var(--color-text-tertiary)]">
              {getGoalDateLabel(goal.createdAt, goal.status)}
            </span>
          </div>
        </button>

        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[goal.status]}`}
        >
          {STATUS_LABELS[goal.status]}
        </span>

        <span className="shrink-0 font-mono text-xs text-[var(--color-text-secondary)]">
          {Math.round(periodCompletionRate)}%
        </span>
      </div>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isExpanded && <GoalAccordionContent goalData={goalData} />}
      </AnimatePresence>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function AreaBalanceDetail({ areaId }: AreaBalanceDetailProps) {
  const roadmapData = useReviewStore((s) => s.roadmapData)
  const selectGoal = useReviewStore((s) => s.selectGoal)

  const areaData = useMemo(
    () => roadmapData.find((a) => a.area.id === areaId),
    [roadmapData, areaId]
  )

  const stats = useMemo(() => (areaData ? getAreaStats(areaData) : null), [areaData])

  // Initialize with first goal expanded
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(() => {
    if (!areaData || areaData.goals.length === 0) return new Set<string>()
    return new Set<string>([areaData.goals[0].goal.id])
  })

  const toggleGoal = useCallback((goalId: string) => {
    setExpandedGoalIds((prev) => {
      const next = new Set(prev)
      if (next.has(goalId)) {
        next.delete(goalId)
      } else {
        next.add(goalId)
      }
      return next
    })
  }, [])

  const handleDrillDown = useCallback(
    (goalId: string) => {
      selectGoal(goalId)
    },
    [selectGoal]
  )

  const sortedGoals = useMemo(
    () =>
      [...(areaData?.goals ?? [])].sort((a, b) => a.goal.createdAt.localeCompare(b.goal.createdAt)),
    [areaData?.goals]
  )

  if (!areaData || !stats) return null

  return (
    <motion.div
      key={areaId}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-5"
    >
      {/* Area header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">{areaData.area.emoji}</span>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {areaData.area.name}
        </h3>
      </div>

      {/* Why card */}
      {areaData.area.why && <WhyCard text={areaData.area.why} />}

      {/* Completion bar */}
      <CompletionBar rate={stats.completionRate} color={areaData.area.color} />

      {/* Stats summary */}
      <p className="text-sm text-[var(--color-text-secondary)]">
        목표 {stats.activeGoals}개 · Task {stats.activeTasks}개
      </p>

      {/* Goal accordion sections (sorted by creation date) */}
      {areaData.goals.length > 0 && (
        <div>
          <span className="mb-2 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
            목표별 현황
          </span>
          <div className="flex flex-col gap-2">
            {sortedGoals.map((goalData) => (
              <GoalAccordionRow
                key={goalData.goal.id}
                goalData={goalData}
                isExpanded={expandedGoalIds.has(goalData.goal.id)}
                onToggle={() => toggleGoal(goalData.goal.id)}
                onDrillDown={() => handleDrillDown(goalData.goal.id)}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
