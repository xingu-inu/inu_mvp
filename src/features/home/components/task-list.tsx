'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Flame } from 'lucide-react'
import { format } from 'date-fns'
import { EmptyTasks } from './empty-tasks'
import { AreaTaskSection } from './area-task-section'
import { SortableTaskList } from './sortable-task-list'
import { DailySection } from './daily-section'
import { PastDaySummary } from './past-day-summary'
import { AiQuickActionInline } from './ai-quick-actions'
import { useHomeStore } from '@/stores/home.store'
import { groupTasksByArea } from '@/lib/utils/task-utils'
import { useActiveAreas } from '@/queries/use-areas'
import { useGoals } from '@/queries/use-goals'
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
  const { data: allGoals = [] } = useGoals()
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

  const streakAtRiskTasks = useMemo(() => {
    if (new Date().getHours() < 18) return []
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const selectedStr = format(selectedDate, 'yyyy-MM-dd')
    if (todayStr !== selectedStr) return []
    return tasks.filter((t) => !t.todayCheckIn?.status && t.streak_count >= 3)
  }, [tasks, selectedDate])

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

  const allGoalsForGrouping = useMemo(
    () =>
      isReadOnly
        ? undefined
        : allGoals.map((g) => ({
            id: g.id,
            name: g.name,
            area_id: g.area_id,
            status: g.status,
          })),
    [allGoals, isReadOnly]
  )

  const { areaGroups, dailyTasks } = useMemo(
    () => groupTasksByArea(filteredTasks, allAreasForGrouping, allGoalsForGrouping),
    [filteredTasks, allAreasForGrouping, allGoalsForGrouping]
  )

  // DnD enabled only when not read-only and filter is 'all' (to prevent sort order confusion)
  const isDndEnabled = !isReadOnly && filter === 'all'

  // Empty state
  if (tasks.length === 0) {
    return <EmptyTasks />
  }

  return (
    <div ref={listRef} className="space-y-4">
      {/* Day summary */}
      <PastDaySummary tasks={tasks} selectedDate={selectedDate} isReadOnly={isReadOnly} />

      {/* Streak at-risk nudge */}
      {streakAtRiskTasks.length > 0 && (
        <button
          onClick={() => {
            const firstTask = streakAtRiskTasks[0]
            setExpandedTaskId(firstTask.id)
            requestAnimationFrame(() => {
              const el = listRef.current?.querySelector(`[data-task-id="${firstTask.id}"]`)
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            })
          }}
          className="flex w-full items-center gap-2 rounded-lg bg-[var(--color-streak-bg)] px-3 py-2 text-left transition-colors hover:brightness-95"
        >
          <Flame className="h-4 w-4 flex-shrink-0 text-[var(--color-streak)]" />
          <span className="text-sm font-medium text-[var(--color-streak)]">
            🔥 {Math.max(...streakAtRiskTasks.map((t) => t.streak_count))}일 스트릭을 이어가세요
          </span>
          <span className="ml-auto text-xs text-[var(--color-text-tertiary)]">지금 체크인</span>
        </button>
      )}

      {/* Filter pills + priority rank button */}
      <div className="flex items-center gap-1">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              'rounded-full px-3 py-2 text-xs font-medium transition-colors',
              filter === opt.value
                ? 'bg-[var(--color-primary-500)] text-white'
                : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]'
            )}
          >
            {opt.label}
          </button>
        ))}
        {!isReadOnly && (
          <div className="ml-auto lg:hidden">
            <AiQuickActionInline />
          </div>
        )}
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
          <DailySection
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
