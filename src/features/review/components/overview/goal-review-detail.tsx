'use client'

import { useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, Link2, PenLine } from 'lucide-react'
import { useReviewStore } from '@/stores/review.store'
import { StreakBadge } from '@/components/ui/badge'
import { WhyCard } from '../why-card'
import { STATUS_STYLES, STATUS_LABELS } from '@/lib/constants/goal-status'
import { CompletionBar } from '@/components/common/completion-bar'
import type { GoalStatus, CheckInStatus, MoodLevel } from '@/types/entities'
import type { GoalReviewData, TaskReviewSummary } from '../../hooks/use-review-roadmap-data'
import { useGoalReflection, useSaveGoalReflection, useReviewPeriod } from '../../hooks'
import { GoalJourneyTimeline } from './goal-journey-timeline'
import { cn } from '@/lib/utils'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GoalReviewDetailProps {
  goalId: string
}

const CHECKIN_DOT_STYLES: Record<CheckInStatus, string> = {
  done: 'bg-emerald-500 dark:bg-emerald-400',
  skip: 'bg-gray-300 dark:bg-gray-600',
  miss: 'bg-red-300 dark:bg-red-500/70',
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Goal Reflection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MOOD_OPTIONS: { value: MoodLevel; emoji: string; label: string }[] = [
  { value: 'terrible', emoji: '😫', label: '힘들었어요' },
  { value: 'bad', emoji: '😕', label: '아쉬워요' },
  { value: 'neutral', emoji: '😐', label: '보통이에요' },
  { value: 'good', emoji: '🙂', label: '괜찮았어요' },
  { value: 'great', emoji: '😄', label: '최고였어요' },
]

function GoalReflectionSection({ goalId }: { goalId: string }) {
  const { startDate, endDate } = useReviewPeriod()
  const { data: reflection } = useGoalReflection(goalId, startDate, endDate)
  const { mutate: save, isPending } = useSaveGoalReflection(goalId, startDate, endDate)

  const [summary, setSummary] = useState('')
  const [feeling, setFeeling] = useState<MoodLevel | null>(null)
  const [nextFocus, setNextFocus] = useState('')
  const [syncedId, setSyncedId] = useState<string | null>(null)

  // 서버 데이터 로드 시 로컬 상태 동기화 (React 권장: render 중 상태 조정)
  if (reflection?.id && reflection.id !== syncedId) {
    setSyncedId(reflection.id)
    setSummary(reflection.summary ?? '')
    setFeeling((reflection.progress_feeling as MoodLevel | null) ?? null)
    setNextFocus(reflection.next_focus ?? '')
  }

  const handleSave = useCallback(() => {
    const trimmedSummary = summary.trim()
    const trimmedNextFocus = nextFocus.trim()
    const hasContent = trimmedSummary || feeling || trimmedNextFocus
    if (!hasContent) return

    save({
      summary: trimmedSummary || undefined,
      progress_feeling: feeling || undefined,
      next_focus: trimmedNextFocus || undefined,
    })
  }, [summary, feeling, nextFocus, save])

  const textareaClass = cn(
    'w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2',
    'text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]',
    'focus:border-[var(--color-primary-400)] focus:ring-1 focus:ring-[var(--color-primary-400)] focus:outline-none',
    'transition-colors',
    isPending && 'opacity-60'
  )

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
      <div className="flex items-center gap-2">
        <PenLine className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        <h4 className="text-xs font-semibold text-[var(--color-text-primary)]">목표 회고</h4>
      </div>

      {/* 진행 느낌 */}
      <div className="mt-3">
        <label className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
          이 목표의 진행 느낌은?
        </label>
        <div className="mt-1.5 flex gap-2">
          {MOOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setFeeling(opt.value)
                save({
                  summary: summary.trim() || undefined,
                  progress_feeling: opt.value,
                  next_focus: nextFocus.trim() || undefined,
                })
              }}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-center transition-colors',
                feeling === opt.value
                  ? 'bg-[var(--color-primary-50)] ring-1 ring-[var(--color-primary-400)]'
                  : 'hover:bg-[var(--color-bg-secondary)]'
              )}
            >
              <span className="text-lg">{opt.emoji}</span>
              <span className="text-[9px] text-[var(--color-text-tertiary)]">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 요약 */}
      <div className="mt-3 flex flex-col gap-1">
        <label className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
          이 목표에서 가장 인상 깊었던 점은?
        </label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={handleSave}
          placeholder="적어보세요..."
          disabled={isPending}
          rows={2}
          className={textareaClass}
        />
      </div>

      {/* 다음 집중 */}
      <div className="mt-2 flex flex-col gap-1">
        <label className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
          다음 기간에 집중하고 싶은 것은?
        </label>
        <textarea
          value={nextFocus}
          onChange={(e) => setNextFocus(e.target.value)}
          onBlur={handleSave}
          placeholder="적어보세요..."
          disabled={isPending}
          rows={2}
          className={textareaClass}
        />
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function findGoalData(
  roadmapData: ReturnType<typeof useReviewStore.getState>['roadmapData'],
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

function CheckInDots({ checkIns }: { checkIns: Array<{ date: string; status: CheckInStatus }> }) {
  if (checkIns.length === 0) return null

  return (
    <div className="flex items-center gap-0.5">
      {checkIns.map((ci) => (
        <span
          key={ci.date}
          className={`inline-block h-2 w-2 rounded-full ${CHECKIN_DOT_STYLES[ci.status]}`}
        />
      ))}
    </div>
  )
}

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
  const roadmapData = useReviewStore((s) => s.roadmapData)

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
