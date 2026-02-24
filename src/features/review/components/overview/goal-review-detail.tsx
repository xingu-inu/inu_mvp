'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, Link2 } from 'lucide-react'
import { useReviewRoadmapData } from '../../hooks/use-review-roadmap-data'
import { StreakBadge } from '@/components/ui/badge'
import { WhyCard } from '../why-card'
import { STATUS_STYLES, STATUS_LABELS } from '@/lib/constants/goal-status'
import { CompletionBar } from '@/components/common/completion-bar'
import type {
  AreaReviewData,
  GoalReviewData,
  TaskReviewSummary,
} from '../../hooks/use-review-roadmap-data'
import { GoalJourneyTimeline } from './goal-journey-timeline'
import { GoalReflectionSection } from './goal-reflection-section'
import { CheckInDots } from './check-in-dots'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GoalReviewDetailProps {
  goalId: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function findGoalData(
  roadmapData: AreaReviewData[],
  goalId: string
): { goalData: GoalReviewData; areaColor: string } | null {
  for (const area of roadmapData) {
    for (const goalData of area.goals) {
      if (goalData.goal.id === goalId) {
        return { goalData, areaColor: area.area.color }
      }
    }
  }
  return null
}

function getGoalTotals(goalData: GoalReviewData): {
  totalDone: number
  totalScheduled: number
} {
  let totalDone = 0
  let totalScheduled = 0

  for (const task of goalData.tasks) {
    if (task.isCrossLinked) continue
    if (task.isActive) {
      totalDone += task.totalDone
      totalScheduled += task.totalScheduled
    }
  }

  return { totalDone, totalScheduled }
}

function getGroupedTasks(tasks: TaskReviewSummary[], groupId: string | null): TaskReviewSummary[] {
  return tasks.filter((t) => t.groupId === groupId && t.isActive && !t.isCrossLinked)
}

function getCrossLinkedTasks(tasks: TaskReviewSummary[]): TaskReviewSummary[] {
  return tasks.filter((t) => t.isCrossLinked === true)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TaskDetailRow({ task }: { task: TaskReviewSummary }) {
  return (
    <div className="py-2">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-primary)]">
          {task.taskName}
        </span>
        <span className="shrink-0 font-mono text-xs text-[var(--color-text-secondary)]">
          {Math.round(task.completionRate)}%
        </span>
        {task.streakCount > 0 && <StreakBadge count={task.streakCount} />}
        {task.bestStreak > 0 && (
          <span className="shrink-0 text-[10px] text-[var(--color-text-tertiary)]">
            best: {task.bestStreak}
          </span>
        )}
      </div>
      <div className="mt-1">
        <CheckInDots checkIns={task.recentCheckIns} />
      </div>
      {task.why && (
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)] italic">{task.why}</p>
      )}
    </div>
  )
}

function GroupSection({
  groupName,
  isCompleted,
  tasks,
}: {
  groupName: string
  isCompleted: boolean
  tasks: TaskReviewSummary[]
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5 py-1">
        <FolderOpen className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">{groupName}</span>
        {isCompleted && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">&#10003;</span>
        )}
      </div>
      <div className="border-l-2 border-[var(--color-border)] pl-3">
        {tasks.length > 0 ? (
          tasks.map((task) => <TaskDetailRow key={task.taskId} task={task} />)
        ) : (
          <p className="py-1.5 text-xs text-[var(--color-text-tertiary)]">활성 Task 없음</p>
        )}
      </div>
    </div>
  )
}

function CrossLinkedSection({ tasks }: { tasks: TaskReviewSummary[] }) {
  if (tasks.length === 0) return null

  return (
    <div className="mt-4">
      <span className="mb-1.5 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
        연결된 Task
      </span>
      <div className="rounded-lg border-2 border-dashed border-[var(--color-border)] p-3">
        {tasks.map((task) => (
          <div key={task.taskId} className="py-1.5">
            <div className="flex items-center gap-2">
              <Link2 className="h-3 w-3 shrink-0 text-[var(--color-text-tertiary)]" />
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-primary)]">
                {task.taskName}
              </span>
              <span className="shrink-0 font-mono text-xs text-[var(--color-text-secondary)]">
                {Math.round(task.completionRate)}%
              </span>
              {task.streakCount > 0 && <StreakBadge count={task.streakCount} />}
            </div>
            {task.sourceGoal && (
              <p className="mt-0.5 pl-5 text-[10px] text-[var(--color-text-tertiary)]">
                from: {task.sourceGoal.name}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function GoalReviewDetail({ goalId }: GoalReviewDetailProps) {
  const { data: roadmapData = [] } = useReviewRoadmapData()

  const found = useMemo(() => findGoalData(roadmapData, goalId), [roadmapData, goalId])

  const totals = useMemo(
    () => (found ? getGoalTotals(found.goalData) : { totalDone: 0, totalScheduled: 0 }),
    [found]
  )

  const sortedGroups = useMemo(() => {
    if (!found) return []
    return [...found.goalData.groups].sort((a, b) => a.sortOrder.localeCompare(b.sortOrder))
  }, [found])

  const ungroupedTasks = useMemo(() => {
    if (!found) return []
    return getGroupedTasks(found.goalData.tasks, null)
  }, [found])

  const crossLinkedTasks = useMemo(() => {
    if (!found) return []
    return getCrossLinkedTasks(found.goalData.tasks)
  }, [found])

  if (!found) return null

  const { goalData, areaColor } = found
  const { goal } = goalData

  return (
    <motion.div
      key={goalId}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-5"
    >
      {/* Goal header */}
      <div className="flex items-center gap-2">
        <span className="text-xl">&#127919;</span>
        <h3 className="min-w-0 flex-1 truncate text-lg font-semibold text-[var(--color-text-primary)]">
          {goal.name}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[goal.status]}`}
        >
          {STATUS_LABELS[goal.status]}
        </span>
      </div>

      {/* Why card */}
      {goal.why && <WhyCard text={goal.why} />}

      {/* Completion bar */}
      <CompletionBar rate={goalData.periodCompletionRate} color={areaColor} />

      {/* Stats */}
      <p className="text-sm text-[var(--color-text-secondary)]">
        완료 {totals.totalDone}/{totals.totalScheduled}
      </p>

      {/* Group sections */}
      {sortedGroups.length > 0 && (
        <div>
          <span className="mb-1.5 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
            그룹별 현황
          </span>
          {sortedGroups.map((group) => (
            <GroupSection
              key={group.id}
              groupName={group.name}
              isCompleted={group.is_completed}
              tasks={getGroupedTasks(goalData.tasks, group.id)}
            />
          ))}
        </div>
      )}

      {/* Ungrouped tasks */}
      {ungroupedTasks.length > 0 && (
        <div>
          <span className="mb-1.5 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
            {sortedGroups.length > 0 ? '그룹 없는 Task' : 'Task 현황'}
          </span>
          <div className="border-l-2 border-[var(--color-border)] pl-3">
            {ungroupedTasks.map((task) => (
              <TaskDetailRow key={task.taskId} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Cross-linked tasks */}
      <CrossLinkedSection tasks={crossLinkedTasks} />

      {/* Goal Journey Timeline */}
      <GoalJourneyTimeline goalId={goalId} />

      {/* Goal reflection */}
      <GoalReflectionSection goalId={goalId} />
    </motion.div>
  )
}
