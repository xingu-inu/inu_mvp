'use client'

import { Suspense } from 'react'
import { isToday as isTodayFn, isFuture, startOfDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { PageContainer } from '@/components/layout'
import {
  HomeHeader,
  UnifiedCalendar,
  TaskList,
  DailyReflectionCard,
  useHomeState,
  useHomeKeyboard,
} from '@/features/home'
import { useHomeTasks, usePrefetchHomeTasks } from '@/queries/use-home'
import { mapApiTasksToEntities, getContextualGreeting } from '@/lib/utils/task-utils'
import { useHomeDirection } from '@/features/home/hooks/use-home-direction'
import { VersionBrowsingBanner } from '@/features/home/components/version-browsing-banner'

import { WeekViewGrid } from '@/features/home/components/week-view'
import { AiQuickActions } from '@/features/home/components/ai-quick-actions'

export default function HomeContentPage() {
  return (
    <PageContainer className="pb-24 lg:h-full lg:pb-0" fullWidth>
      <Suspense fallback={<HomePageSkeleton />}>
        <HomeContent />
      </Suspense>
    </PageContainer>
  )
}

function HomeContent() {
  const { currentDate, view } = useHomeState()
  const { selectedDirectionId } = useHomeDirection()
  usePrefetchHomeTasks(currentDate, selectedDirectionId ?? undefined)
  useHomeKeyboard()

  return (
    <div
      className={cn(
        'space-y-6 px-4 py-6 lg:px-6',
        view === 'week' && 'lg:flex lg:h-full lg:flex-col lg:gap-4 lg:space-y-0'
      )}
    >
      <HomeHeader />

      {view === 'week' && <WeekView />}
      {view === 'month' && <MonthView />}
    </div>
  )
}

/** Week view: 7-day grid with time slot rows */
function WeekView() {
  return (
    <div className="lg:min-h-0 lg:flex-1">
      {/* Mobile only: task list ABOVE grid for immediate action access */}
      <MobileTaskSection />
      <WeekViewGrid />
    </div>
  )
}

/** Month view: full calendar + selected date's task list */
function MonthView() {
  return (
    <>
      {/* Mobile only: task list above calendar for immediate access */}
      <MobileTaskSection />
      <UnifiedCalendar />
    </>
  )
}

/** Task list section — visible on mobile only, desktop uses the right panel */
function MobileTaskSection() {
  const { currentDate } = useHomeState()
  const { isCurrentVersion, selectedVersion, selectedDirectionId } = useHomeDirection()
  const { data: apiTasks = [], isLoading } = useHomeTasks(
    currentDate,
    selectedDirectionId ?? undefined
  )

  const tasks = mapApiTasksToEntities(apiTasks)
  const viewingFuture = isFuture(startOfDay(currentDate))
  const viewingToday = isTodayFn(currentDate)
  const isReadOnly = !isCurrentVersion

  return (
    <div className="space-y-4 lg:hidden">
      {isLoading ? (
        <TaskListSkeleton />
      ) : (
        <>
          {!isCurrentVersion && <VersionBrowsingBanner version={selectedVersion} />}

          {/* Contextual greeting + progress for mobile */}
          {viewingToday && isCurrentVersion && tasks.length > 0 && (
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              {getContextualGreeting(tasks)}
            </p>
          )}

          {!isReadOnly && <AiQuickActions />}
          <TaskList
            tasks={tasks}
            selectedDate={currentDate}
            isReadOnly={isReadOnly}
            enableAiSuggest={!isReadOnly}
          />
          {!viewingFuture && <DailyReflectionCard tasks={tasks} date={currentDate} />}
        </>
      )}
    </div>
  )
}

function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
      ))}
    </div>
  )
}

function HomePageSkeleton() {
  return (
    <div className="space-y-6 px-4 py-6 lg:px-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-[var(--color-bg-secondary)]" />
          <div className="h-10 w-10 animate-pulse rounded-lg bg-[var(--color-bg-secondary)]" />
          <div className="h-7 w-28 animate-pulse rounded bg-[var(--color-bg-secondary)]" />
        </div>
      </div>

      {/* Calendar skeleton */}
      <div className="h-[60px] animate-pulse rounded-2xl bg-[var(--color-bg-secondary)]/50" />

      {/* Task list skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
        ))}
      </div>
    </div>
  )
}
