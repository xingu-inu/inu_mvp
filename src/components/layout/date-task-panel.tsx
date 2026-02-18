'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { format, isToday, isFuture, startOfDay, isBefore, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar, Sparkles } from 'lucide-react'
import { usePanelDateStore } from '@/stores/panel-date.store'
import { useHomeStore } from '@/stores/home.store'
import { useHomeTasks } from '@/queries/use-home'
import {
  mapApiTasksToEntities,
  getContextualGreeting,
  calculateTaskStats,
} from '@/lib/utils/task-utils'
import { TaskList } from '@/features/home/components/task-list'

import { DailyReflectionCard } from '@/features/home/components/daily-reflection-card'
import { TaskDetailPanel } from '@/features/home/components/panel-modes/task-detail-panel'
import { HomeGoalView } from '@/features/home/components/panel-modes/home-goal-view'

const PriorityRankModal = dynamic(
  () =>
    import('@/features/home/components/priority-rank-modal').then((m) => ({
      default: m.PriorityRankModal,
    })),
  { ssr: false }
)
import { GoalBrowsePanel } from '@/features/roadmap/components/panel-modes'
import { GroupEditForm, GroupCreateForm } from '@/features/roadmap'
import { useRoadmapStore, selectPanelMode } from '@/stores/roadmap.store'
import { ReviewPanel } from '@/features/review/components/review-panel'
import { useDirection } from '@/queries/use-direction'

const EVENING_HOUR = 18
const REFLECTION_THRESHOLD = 50

function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
      <div className="h-16 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
      <div className="h-16 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
    </div>
  )
}

/** Full daily panel — tasks, check-in, reflection */
function HomeDailyPanel() {
  const selectedDate = usePanelDateStore((s) => s.selectedDate)
  const panelMode = useHomeStore((s) => s.panelMode)

  // Delegate to sub-panels for task-detail and goal-view modes
  if (panelMode === 'task-detail') {
    return <TaskDetailPanel />
  }

  if (panelMode === 'goal-view') {
    return <HomeGoalView />
  }

  return <HomeDailyContent selectedDate={selectedDate} />
}

function HomeDailyContent({ selectedDate }: { selectedDate: Date }) {
  const { data: apiTasks = [], isLoading } = useHomeTasks(selectedDate)
  const { data: currentDirection } = useDirection()
  const tasks = mapApiTasksToEntities(apiTasks)
  const viewingToday = isToday(selectedDate)
  const viewingFuture = isFuture(startOfDay(selectedDate))
  const dateLabel = format(selectedDate, 'M월 d일 EEEE', { locale: ko })
  const stats = calculateTaskStats(tasks)
  const setIsPriorityRankOpen = useHomeStore((s) => s.setIsPriorityRankOpen)

  // Detect if selected date is before the current direction was created
  const isOldDirectionDate = !!(
    currentDirection?.created_at &&
    isBefore(startOfDay(selectedDate), startOfDay(parseISO(currentDirection.created_at)))
  )

  // Derived flags for reflection card placement
  const currentHour = new Date().getHours()
  const showReflection = !viewingFuture
  const reflectionAbove =
    stats.isAllDone ||
    (viewingToday && currentHour >= EVENING_HOUR && stats.completionRate >= REFLECTION_THRESHOLD)

  return (
    <div className="flex h-full flex-col">
      {/* Date header + contextual greeting + priority rank button */}
      <div className="border-b border-[var(--color-border)] px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <h2 className="text-sm font-semibold">{dateLabel}</h2>
            </div>
            {viewingToday && tasks.length > 0 && (
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {getContextualGreeting(tasks)}
              </p>
            )}
          </div>
          {tasks.length > 0 && (
            <button
              type="button"
              onClick={() => setIsPriorityRankOpen(true)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-ai)] px-3 py-2 text-xs font-medium text-white shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              우선순위 정리
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-5">
        {isLoading ? (
          <PanelSkeleton />
        ) : (
          <>

            {showReflection && reflectionAbove && (
              <DailyReflectionCard tasks={tasks} date={selectedDate} />
            )}
            <TaskList
              tasks={tasks}
              isReadOnly={isOldDirectionDate}
              selectedDate={selectedDate}
              enableAiSuggest={!isOldDirectionDate}
            />
            {showReflection && !reflectionAbove && (
              <DailyReflectionCard tasks={tasks} date={selectedDate} />
            )}
          </>
        )}
      </div>

      {/* Priority rank modal */}
      <PriorityRankModal />
    </div>
  )
}

/** Roadmap right panel — routes by panelMode for group forms */
function RoadmapPanel() {
  const panelMode = useRoadmapStore(selectPanelMode)

  switch (panelMode) {
    case 'edit-group':
      return <GroupEditForm />
    case 'create-group':
      return <GroupCreateForm />
    default:
      return <GoalBrowsePanel />
  }
}

/** Derive the main tab from pathname */
function useMainTab(): 'home' | 'roadmap' | 'review' {
  const pathname = usePathname()
  if (pathname.startsWith('/review')) return 'review'
  if (pathname.startsWith('/roadmap')) return 'roadmap'
  return 'home'
}

/** Main exported component - unified panel */
export function DateTaskPanel() {
  const mainTab = useMainTab()

  // Review → 공유 패널에서 상세 뷰 표시
  if (mainTab === 'review') {
    return <ReviewPanel />
  }

  // Roadmap → panelMode에 따라 라우팅
  if (mainTab === 'roadmap') {
    return (
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-hidden">
          <RoadmapPanel />
        </div>
      </div>
    )
  }

  // Home → daily panel 직접 렌더
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <HomeDailyPanel />
      </div>
    </div>
  )
}
