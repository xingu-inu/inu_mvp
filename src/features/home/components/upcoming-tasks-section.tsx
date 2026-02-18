'use client'

import { useMemo } from 'react'
import { format, isToday, parseISO, startOfDay, isBefore } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarClock } from 'lucide-react'
import { useWeekTasks } from '../hooks/use-week-tasks'
import { usePanelDateStore } from '@/stores/panel-date.store'
import { mapApiTasksToEntities } from '@/lib/utils/task-utils'
import { cn } from '@/lib/utils'
import type { HomeTask } from '@/types/entities'

interface UpcomingTask {
  task: HomeTask
  dateStr: string
  dateLabel: string
}

export function UpcomingTasksSection({ currentDate }: { currentDate: Date }) {
  const { tasksByDate } = useWeekTasks(currentDate)
  const setSelectedDate = usePanelDateStore((s) => s.setSelectedDate)
  const viewingToday = isToday(currentDate)

  const upcomingTasks = useMemo(() => {
    // Only compute upcoming tasks when viewing today
    if (!viewingToday) return []

    const today = startOfDay(new Date())
    const result: UpcomingTask[] = []

    for (const [dateStr, apiTasks] of Object.entries(tasksByDate)) {
      const date = parseISO(dateStr)
      if (!isBefore(today, startOfDay(date))) continue // skip today and past

      const tasks = mapApiTasksToEntities(apiTasks)
      const onceTasks = tasks.filter(
        (t: HomeTask) => t.repeat_type === 'once' && t.status === 'active' && !t.todayCheckIn
      )

      for (const task of onceTasks) {
        result.push({
          task,
          dateStr,
          dateLabel: format(date, 'M/d (EEE)', { locale: ko }),
        })
      }
    }

    return result
  }, [tasksByDate, viewingToday])

  if (upcomingTasks.length === 0) return null

  return (
    <section aria-labelledby="upcoming-tasks">
      <div className="mb-1.5 flex items-center gap-1.5">
        <CalendarClock className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        <h2 id="upcoming-tasks" className="text-xs font-medium text-[var(--color-text-tertiary)]">
          이번 주 예정
        </h2>
        <span className="text-[11px] text-[var(--color-text-quaternary)] tabular-nums">
          {upcomingTasks.length}
        </span>
      </div>
      <div className="space-y-0.5">
        {upcomingTasks.map(({ task, dateStr, dateLabel }) => (
          <button
            key={task.id}
            type="button"
            onClick={() => setSelectedDate(parseISO(dateStr))}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
              'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
            )}
          >
            <span className="flex-shrink-0 rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text-tertiary)]">
              {dateLabel}
            </span>
            <span className="min-w-0 truncate">{task.name}</span>
            {task.goal?.area && (
              <span className="ml-auto flex-shrink-0 text-[11px] text-[var(--color-text-quaternary)]">
                {task.goal.area.emoji}
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}
