'use client'

import { Suspense, useMemo } from 'react'
import { isFuture, startOfDay, startOfWeek, format } from 'date-fns'
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
import { mapApiTasksToEntities } from '@/lib/utils/task-utils'
import { useHomeDirection } from '@/features/home/hooks/use-home-direction'
import { VersionBrowsingBanner } from '@/features/home/components/version-browsing-banner'
import { GCalEventSection } from '@/features/home/components/gcal-event-section'
import { useGoogleCalendarEvents } from '@/queries/use-google-calendar-events'

import { WeekViewGrid } from '@/features/home/components/week-view'
import { CompactWeekStrip } from '@/features/home/components/compact-week-strip'

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
        'space-y-2 px-4 py-2 lg:space-y-6 lg:px-6 lg:py-6',
        view === 'week' && 'lg:flex lg:h-full lg:flex-col lg:gap-4 lg:space-y-0'
      )}
    >
      <HomeHeader />

      {view === 'week' && <WeekView />}
      {view === 'month' && <MonthView />}
    </div>
  )
}

/** Week view: compact strip (mobile) or full time-slot grid (desktop) */
function WeekView() {
  return (
    <>
      {/* Mobile: compact week strip on top → tasks below (Todomate-style) */}
      <div className="space-y-2 lg:hidden">
        <CompactWeekStrip />
        <MobileTaskSection />
      </div>
      {/* Desktop: full 7-day time-slot grid (unchanged) */}
      <div className="hidden lg:flex lg:min-h-0 lg:flex-1">
        <WeekViewGrid />
      </div>
    </>
  )
}

/** Month view: calendar on top → tasks below (mobile), calendar only (desktop) */
function MonthView() {
  return (
    <>
      {/* Mobile: month calendar on top → tasks below (Todomate-style) */}
      <div className="space-y-4 lg:hidden">
        <UnifiedCalendar />
        <MobileTaskSection />
      </div>
      {/* Desktop: just calendar (right panel has tasks) */}
      <div className="hidden lg:block">
        <UnifiedCalendar />
      </div>
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
  const isReadOnly = !isCurrentVersion

  // Google Calendar events for selected date
  const weekStartStr = format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')
  const { data: googleEvents = [] } = useGoogleCalendarEvents(weekStartStr)
  const selectedDateStr = format(currentDate, 'yyyy-MM-dd')
  const dayGCalEvents = useMemo(
    () => googleEvents.filter((e) => e.dateStr === selectedDateStr),
    [googleEvents, selectedDateStr]
  )

  return (
    <div className="space-y-4">
      {isLoading ? (
        <TaskListSkeleton />
      ) : (
        <>
          {!isCurrentVersion && <VersionBrowsingBanner version={selectedVersion} />}

          <TaskList
            tasks={tasks}
            selectedDate={currentDate}
            isReadOnly={isReadOnly}
            enableAiSuggest={!isReadOnly}
          />
          <GCalEventSection events={dayGCalEvents} />
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
    <div className="space-y-2 px-4 py-2 lg:space-y-6 lg:px-6 lg:py-6">
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
