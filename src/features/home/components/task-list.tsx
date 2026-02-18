'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { CompactTaskRow } from './compact-task-row'
import { EmptyTasks } from './empty-tasks'
import { AreaTaskSection } from './area-task-section'
import { SortableTaskList } from './sortable-task-list'
import { InlineTaskInput } from './inline-task-input'
import { DailySectionHeader } from './daily-section-header'
import { useHomeStore } from '@/stores/home.store'
import { groupTasksByArea } from '@/lib/utils/task-utils'
import { useActiveAreas } from '@/queries/use-areas'
import { cn } from '@/lib/utils'
import type { HomeTask } from '@/types/entities'

type TaskFilter = 'all' | 'pending' | 'done'

const FILTER_OPTIONS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '미완료' },
  { value: 'done', label: '완료' },
]

interface TaskListProps {
  tasks: HomeTask[]
  isReadOnly?: boolean
  selectedDate: Date
  enableAiSuggest?: boolean
}

export function TaskList({
  tasks,
  isReadOnly = false,
  selectedDate,
  enableAiSuggest,
}: TaskListProps) {
  const { data: activeAreas = [] } = useActiveAreas()
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Subscribe to highlightedTaskId from store (set by week grid click)
  // Use Zustand subscribe to avoid cascading setState inside useEffect
  useEffect(() => {
    const unsubscribe = useHomeStore.subscribe((state, prevState) => {
      if (state.highlightedTaskId && state.highlightedTaskId !== prevState.highlightedTaskId) {
        const taskId = state.highlightedTaskId
        setExpandedTaskId(taskId)
        // Reset highlighted after consuming
        state.setHighlightedTaskId(null)
        // Scroll into view after a short delay (for animation)
        requestAnimationFrame(() => {
          const el = listRef.current?.querySelector(`[data-task-id="${taskId}"]`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        })
      }
    })
    return unsubscribe
  }, [])

  const handleToggle = useCallback((taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId))
  }, [])

  const handleDragStart = useCallback(() => {
    setExpandedTaskId(null)
  }, [])

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks
    if (filter === 'pending') return tasks.filter((t) => !t.todayCheckIn?.status)
    return tasks.filter((t) => !!t.todayCheckIn?.status)
  }, [tasks, filter])

  const { overdueTasks, normalTasks } = useMemo(() => {
    const overdue = filteredTasks.filter((t) => t.isOverdue)
    const normal = filteredTasks.filter((t) => !t.isOverdue)
    return { overdueTasks: overdue, normalTasks: normal }
  }, [filteredTasks])

  const allAreasForGrouping = useMemo(
    () =>
      isReadOnly
        ? undefined
        : activeAreas.map((a) => ({
            id: a.id,
            name: a.name,
            emoji: a.emoji,
            color: a.color,
            sort_order: a.sort_order,
          })),
    [activeAreas, isReadOnly]
  )

  const { areaGroups, dailyTasks } = useMemo(
    () => groupTasksByArea(normalTasks, allAreasForGrouping),
    [normalTasks, allAreasForGrouping]
  )

  // DnD enabled only when not read-only and filter is 'all' (to prevent sort order confusion)
  const isDndEnabled = !isReadOnly

  // Empty state
  if (tasks.length === 0) {
    return <EmptyTasks />
  }

  return (
    <div ref={listRef} className="space-y-4">
      {/* Overdue tasks section */}
      {overdueTasks.length > 0 && (
        <OverdueSection
          tasks={overdueTasks}
          isReadOnly={isReadOnly}
          selectedDate={selectedDate}
          expandedTaskId={expandedTaskId}
          onToggle={handleToggle}
        />
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-1">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === opt.value
                ? 'bg-[var(--color-primary-500)] text-white'
                : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isDndEnabled ? (
        <SortableTaskList
          areaGroups={areaGroups}
          dailyTasks={dailyTasks}
          isReadOnly={isReadOnly}
          selectedDate={selectedDate}
          expandedTaskId={expandedTaskId}
          onToggle={handleToggle}
          onDragStart={handleDragStart}
          enableAiSuggest={enableAiSuggest}
        />
      ) : (
        <>
          {areaGroups.map((group) => (
            <AreaTaskSection
              key={group.area.id}
              area={group.area}
              goals={group.goals}
              tasks={group.tasks}
              stats={group.stats}
              isReadOnly={isReadOnly}
              selectedDate={selectedDate}
              expandedTaskId={expandedTaskId}
              onToggle={handleToggle}
              enableAiSuggest={enableAiSuggest}
            />
          ))}
          <StaticDailySection
            tasks={dailyTasks}
            isReadOnly={isReadOnly}
            selectedDate={selectedDate}
            expandedTaskId={expandedTaskId}
            onToggle={handleToggle}
            enableAiSuggest={enableAiSuggest}
          />
        </>
      )}
    </div>
  )
}

/** Overdue tasks section -- displayed at the top with miss-color styling */
function OverdueSection({
  tasks,
  isReadOnly,
  selectedDate,
  expandedTaskId,
  onToggle,
}: {
  tasks: HomeTask[]
  isReadOnly?: boolean
  selectedDate: Date
  expandedTaskId: string | null
  onToggle: (taskId: string) => void
}) {
  return (
    <section
      aria-labelledby="overdue-tasks"
      className="rounded-lg border border-[var(--color-miss)] bg-[var(--color-miss-bg)] px-3 py-2"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-miss)]" />
        <h2 id="overdue-tasks" className="text-sm font-medium text-[var(--color-miss)]">
          지연된 할일
        </h2>
        <span className="font-mono text-xs text-[var(--color-miss)] tabular-nums">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-0.5">
        {tasks.map((task) => {
          const daysOverdue = task.scheduledDate
            ? differenceInDays(new Date(), parseISO(task.scheduledDate))
            : 0
          return (
            <CompactTaskRow
              key={task.id}
              task={task}
              isReadOnly={isReadOnly}
              selectedDate={selectedDate}
              overdueDays={daysOverdue > 0 ? daysOverdue : undefined}
              isExpanded={expandedTaskId === task.id}
              onToggle={onToggle}
            />
          )
        })}
      </div>
    </section>
  )
}

/** Static daily section (when DnD is disabled) */
function StaticDailySection({
  tasks,
  isReadOnly,
  selectedDate,
  expandedTaskId,
  onToggle,
  enableAiSuggest,
}: {
  tasks: HomeTask[]
  isReadOnly?: boolean
  selectedDate: Date
  expandedTaskId: string | null
  onToggle: (taskId: string) => void
  enableAiSuggest?: boolean
}) {
  return (
    <section
      aria-labelledby="daily-tasks"
      className="border-l-2 pl-3"
      style={{ borderLeftColor: 'var(--color-text-tertiary)' }}
    >
      <DailySectionHeader taskCount={tasks.length} />
      <div className="space-y-0.5">
        {tasks.map((task) => (
          <CompactTaskRow
            key={task.id}
            task={task}
            isReadOnly={isReadOnly}
            selectedDate={selectedDate}
            isExpanded={expandedTaskId === task.id}
            onToggle={onToggle}
          />
        ))}
        {!isReadOnly && (
          <InlineTaskInput selectedDate={selectedDate} enableAiSuggest={enableAiSuggest} />
        )}
      </div>
    </section>
  )
}
