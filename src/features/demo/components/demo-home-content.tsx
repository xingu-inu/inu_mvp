'use client'

import { Suspense } from 'react'
import { isToday as isTodayFn } from 'date-fns'
import { cn } from '@/lib/utils'
import { PageContainer } from '@/components/layout'
import { HomeHeader, UnifiedCalendar, TaskList, useHomeState } from '@/features/home'
import { useHomeTasks } from '@/queries/use-home'
import { getContextualGreeting } from '@/lib/utils/task-utils'
import { WeekViewGrid } from '@/features/home/components/week-view'
import { DemoMobileTaskGate } from './demo-mobile-task-gate'

export function DemoHomeContent() {
  return (
    <PageContainer className="pb-24 lg:h-full lg:pb-0" fullWidth>
      <Suspense fallback={<DemoHomePageSkeleton />}>
        <DemoHomeInner />
      </Suspense>
    </PageContainer>
  )
}

function DemoHomeInner() {
  const { view } = useHomeState()

  return (
    <div
      className={cn(
        'space-y-6 px-4 py-6 lg:px-6',
        view === 'week' && 'lg:flex lg:h-full lg:flex-col lg:gap-4 lg:space-y-0'
      )}
    >
      <HomeHeader />

      {view === 'week' && <DemoWeekView />}
      {view === 'month' && <DemoMonthView />}
    </div>
  )
}

/** Week view: 7-day grid with time slot rows */
function DemoWeekView() {
  return (
    <div className="lg:min-h-0 lg:flex-1">
      <DemoMobileTaskSection />
      <WeekViewGrid />
    </div>
  )
}

/** Month view: full calendar + selected date's task list */
function DemoMonthView() {
  return (
    <>
      <DemoMobileTaskSection />
      <UnifiedCalendar />
    </>
  )
}

/** Task list section -- visible on mobile only, desktop uses the right panel */
function DemoMobileTaskSection() {
  const { currentDate } = useHomeState()
  const { data: tasks = [], isLoading } = useHomeTasks(currentDate)
  const viewingToday = isTodayFn(currentDate)

  return (
    <div className="space-y-4 lg:hidden">
      {isLoading ? (
        <DemoTaskListSkeleton />
      ) : (
        <>
          {viewingToday && tasks.length > 0 && (
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              {getContextualGreeting(tasks)}
            </p>
          )}
          <DemoMobileTaskGate taskCount={tasks.length}>
            <TaskList tasks={tasks} selectedDate={currentDate} isReadOnly enableAiSuggest={false} />
          </DemoMobileTaskGate>
        </>
      )}
    </div>
  )
}

function DemoTaskListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
      ))}
    </div>
  )
}

function DemoHomePageSkeleton() {
  return (
    <div className="space-y-6 px-4 py-6 lg:px-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-[var(--color-bg-secondary)]" />
          <div className="h-10 w-10 animate-pulse rounded-lg bg-[var(--color-bg-secondary)]" />
          <div className="h-7 w-28 animate-pulse rounded bg-[var(--color-bg-secondary)]" />
        </div>
      </div>
      <div className="h-[60px] animate-pulse rounded-2xl bg-[var(--color-bg-secondary)]/50" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
        ))}
      </div>
    </div>
  )
}
