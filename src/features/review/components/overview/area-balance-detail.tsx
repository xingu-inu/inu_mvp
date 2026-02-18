'use client'

import { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronRight, FolderOpen } from 'lucide-react'
import { useReviewStore } from '@/stores/review.store'
import { StreakBadge } from '@/components/ui/badge'
import { WhyCard } from '../why-card'
import { EVENT_ICONS, EVENT_LABELS } from '../../hooks/use-activity-log'
import type { GoalStatus } from '@/types/entities'
import type {
  AreaReviewData,
  GoalReviewData,
  TaskReviewSummary,
} from '../../hooks/use-review-roadmap-data'
import type { AreaChangesSummary } from '../../utils/timeline-utils'
import type { ActivityEvent } from '../../hooks/use-activity-log'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AreaBalanceDetailProps {
  areaId: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_RECENT_EVENTS = 5

const STATUS_STYLES: Record<GoalStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  backlog: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-amber-100 text-amber-700',
  paused: 'bg-orange-100 text-orange-700',
  archived: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<GoalStatus, string> = {
  active: '진행중',
  backlog: '백로그',
  completed: '완료',
  maintenance: '유지',
  paused: '일시정지',
  archived: '아카이브',
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getAreaEvents(changes: AreaChangesSummary | undefined): ActivityEvent[] {
  if (!changes || changes.events.length === 0) return []

  return [...changes.events]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_RECENT_EVENTS)
}

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CompletionBar({ rate, color }: { rate: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
        완료율
      </span>
      <div className="flex items-center gap-3">
        <div className="h-3 flex-1 rounded-full bg-[var(--color-bg-tertiary)]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.round(rate)}%`, backgroundColor: color }}
          />
        </div>
        <span className="w-10 text-right font-mono text-sm font-semibold text-[var(--color-text-primary)]">
          {Math.round(rate)}%
        </span>
      </div>
    </div>
  )
}

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
                {group.is_completed && <span className="text-xs text-emerald-600">&#10003;</span>}
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
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text-primary)]">
            {goal.name}
          </span>
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

function EventRow({ event }: { event: ActivityEvent }) {
  const dateLabel = format(parseISO(event.date.slice(0, 10)), 'M/d')

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-8 shrink-0 text-right text-xs text-[var(--color-text-tertiary)]">
        {dateLabel}
      </span>
      <span className="shrink-0 text-sm">{EVENT_ICONS[event.type]}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-primary)]">
        &quot;{event.entityName}&quot;
      </span>
      <span className="shrink-0 text-xs text-[var(--color-text-secondary)]">
        {EVENT_LABELS[event.type]}
      </span>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function AreaBalanceDetail({ areaId }: AreaBalanceDetailProps) {
  const roadmapData = useReviewStore((s) => s.roadmapData)
  const areaChanges = useReviewStore((s) => s.areaChanges)
  const selectGoal = useReviewStore((s) => s.selectGoal)

  const areaData = useMemo(
    () => roadmapData.find((a) => a.area.id === areaId),
    [roadmapData, areaId]
  )

  const changesData = useMemo(
    () => areaChanges.find((a) => a.areaId === areaId),
    [areaChanges, areaId]
  )

  const recentEvents = useMemo(() => getAreaEvents(changesData), [changesData])

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

      {/* Goal accordion sections */}
      {areaData.goals.length > 0 && (
        <div>
          <span className="mb-2 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
            목표별 현황
          </span>
          <div className="flex flex-col gap-2">
            {areaData.goals.map((goalData) => (
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

      {/* Recent events */}
      {recentEvents.length > 0 && (
        <div>
          <span className="mb-1.5 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
            최근 변화
          </span>
          <div className="flex flex-col">
            {recentEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
