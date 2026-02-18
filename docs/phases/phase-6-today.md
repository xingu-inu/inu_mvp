# Phase 6: Today Screen (Main Hub)

> **Goal**: Implement the main daily view with task cards and check-in functionality

---

## 📚 Reference Documents

- `docs/plan/screens/today/spec.md`
- `docs/plan/screens/today/wireframe.md`
- `docs/plan/components/task-card.md`
- `docs/plan/components/empty-states.md`
- `docs/plan/reference/features/checkin-streak.md`
- `docs/plan/reference/features/daily-life.md`

---

## 6.1 Today Page Structure

### src/app/(main)/today/page.tsx

```typescript
import { Suspense } from 'react'
import { PageContainer } from '@/components/layout/page-container'
import { TodayHeader } from '@/features/today/components/today-header'
import { ProgressSummary } from '@/features/today/components/progress-summary'
import { TaskList } from '@/features/today/components/task-list'
import { AIInsightCard } from '@/features/today/components/ai-insight-card'
import { QuickAddButton } from '@/features/today/components/quick-add-button'
import { TaskListSkeleton } from '@/features/today/components/task-list-skeleton'

export default function TodayPage() {
  return (
    <PageContainer className="pb-24">
      {/* Date Header */}
      <TodayHeader />

      {/* Progress Summary */}
      <div className="mt-6">
        <ProgressSummary />
      </div>

      {/* AI Insight (conditional) */}
      <div className="mt-6">
        <AIInsightCard />
      </div>

      {/* Task List */}
      <div className="mt-6">
        <Suspense fallback={<TaskListSkeleton />}>
          <TaskList />
        </Suspense>
      </div>

      {/* Quick Add FAB */}
      <QuickAddButton />
    </PageContainer>
  )
}
```

---

## 6.2 Today Header Component

### src/features/today/components/today-header.tsx

```typescript
'use client'

import { useState } from 'react'
import { format, addDays, subDays, isToday, isYesterday, isTomorrow } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TodayHeaderProps {
  date?: Date
  onDateChange?: (date: Date) => void
}

export function TodayHeader({ date = new Date(), onDateChange }: TodayHeaderProps) {
  const [currentDate, setCurrentDate] = useState(date)

  const handlePrevDay = () => {
    const newDate = subDays(currentDate, 1)
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }

  const handleNextDay = () => {
    const newDate = addDays(currentDate, 1)
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }

  const getDateLabel = (d: Date) => {
    if (isToday(d)) return 'Today'
    if (isYesterday(d)) return 'Yesterday'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'EEEE')
  }

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={handlePrevDay}
        className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
        aria-label="Previous day"
      >
        <ChevronLeft className="w-5 h-5 text-foreground-secondary" />
      </button>

      <div className="text-center">
        <h1 className="text-2xl font-bold">{getDateLabel(currentDate)}</h1>
        <p className="text-sm text-foreground-secondary">
          {format(currentDate, 'MMMM d, yyyy')}
        </p>
      </div>

      <button
        onClick={handleNextDay}
        className={cn(
          'p-2 rounded-lg hover:bg-surface-secondary transition-colors',
          isToday(currentDate) && 'opacity-50 cursor-not-allowed'
        )}
        disabled={isToday(currentDate)}
        aria-label="Next day"
      >
        <ChevronRight className="w-5 h-5 text-foreground-secondary" />
      </button>
    </div>
  )
}
```

---

## 6.3 Progress Summary Component

### src/features/today/components/progress-summary.tsx

```typescript
'use client'

import { useTodayTasks } from '@/queries/use-tasks'
import { Card } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress'

export function ProgressSummary() {
  const { data: tasks = [] } = useTodayTasks()

  const total = tasks.length
  const completed = tasks.filter((t) => t.check_ins?.[0]?.status === 'done').length
  const skipped = tasks.filter((t) => t.check_ins?.[0]?.status === 'skip').length
  const remaining = total - completed - skipped

  if (total === 0) return null

  return (
    <Card variant="hero" className="text-center">
      <div className="text-4xl font-extrabold font-mono text-primary-500 mb-2">
        {completed}/{total}
      </div>
      <p className="text-foreground-secondary text-sm mb-4">tasks completed</p>

      <ProgressBar value={completed} max={total} />

      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-done" />
          <span className="text-foreground-secondary">{completed} done</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-skip" />
          <span className="text-foreground-secondary">{skipped} skipped</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-border" />
          <span className="text-foreground-secondary">{remaining} left</span>
        </div>
      </div>
    </Card>
  )
}
```

---

## 6.4 Task List Component

### src/features/today/components/task-list.tsx

```typescript
'use client'

import { useTodayTasks } from '@/queries/use-tasks'
import { TaskCard } from '@/features/today/components/task-card'
import { EmptyTasks } from '@/features/today/components/empty-tasks'
import { groupTasksByTimeSlot } from '@/lib/utils/task-utils'

const TIME_SLOT_LABELS: Record<string, { label: string; emoji: string }> = {
  early_morning: { label: 'Early Morning', emoji: '☀️' },
  morning: { label: 'Morning', emoji: '🌤' },
  late_morning: { label: 'Late Morning', emoji: '🌞' },
  afternoon: { label: 'Afternoon', emoji: '🌆' },
  evening: { label: 'Evening', emoji: '🌙' },
  night: { label: 'Night', emoji: '🌙' },
  anytime: { label: 'Anytime', emoji: '⏰' },
}

export function TaskList() {
  const { data: tasks = [], isLoading } = useTodayTasks()

  if (isLoading) return null

  if (tasks.length === 0) {
    return <EmptyTasks />
  }

  const groupedTasks = groupTasksByTimeSlot(tasks)
  const timeSlotOrder = [
    'early_morning',
    'morning',
    'late_morning',
    'afternoon',
    'evening',
    'night',
    'anytime',
  ]

  return (
    <div className="space-y-6">
      {timeSlotOrder.map((slot) => {
        const slotTasks = groupedTasks[slot]
        if (!slotTasks?.length) return null

        const { label, emoji } = TIME_SLOT_LABELS[slot]

        return (
          <section key={slot}>
            <h2 className="text-sm font-medium text-foreground-secondary mb-3 flex items-center gap-2">
              <span>{emoji}</span>
              <span>{label}</span>
              <span className="text-foreground-tertiary">({slotTasks.length})</span>
            </h2>
            <div className="space-y-3">
              {slotTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
```

---

## 6.5 Task Card Component

### src/features/today/components/task-card.tsx

```typescript
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { StreakBadge } from '@/components/ui/badge'
import { ParticleBurst, Confetti } from '@/components/ui/animations'
import { useCheckIn } from '@/queries/use-checkin'
import { ChevronDown, ChevronUp, Check, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task, CheckInStatus } from '@/types/entities'

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  const [showWhy, setShowWhy] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const checkIn = useCheckIn()
  const currentCheckIn = task.check_ins?.[0]
  const status = currentCheckIn?.status

  const handleCheckIn = (newStatus: CheckInStatus) => {
    const today = format(new Date(), 'yyyy-MM-dd')

    checkIn.mutate(
      { task_id: task.id, date: today, status: newStatus },
      {
        onSuccess: () => {
          if (newStatus === 'done') {
            setShowParticles(true)

            // Confetti every 5 streaks
            const newStreak = task.streak_count + 1
            if (newStreak % 5 === 0) {
              setShowConfetti(true)
            }
          }
        },
      }
    )
  }

  const cardVariant = status === 'done' ? 'done' : status === 'skip' ? 'skip' : 'default'

  return (
    <Card variant={cardVariant} className="relative overflow-visible">
      {/* Particle Animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <ParticleBurst trigger={showParticles} />
      </div>
      <Confetti trigger={showConfetti} />

      <div className="flex items-start justify-between gap-4">
        {/* Left: Task Info */}
        <div className="flex-1 min-w-0">
          {/* Area Chip + Streak */}
          <div className="flex items-center gap-2 mb-2">
            {task.goal?.area && (
              <Chip
                variant="area"
                emoji={task.goal.area.emoji}
                color={task.goal.area.color}
              >
                {task.goal.area.name}
              </Chip>
            )}
            <StreakBadge count={task.streak_count} animate={showParticles} />
          </div>

          {/* Task Name */}
          <h3 className={cn('font-semibold', status === 'done' && 'line-through opacity-60')}>
            {task.name}
          </h3>

          {/* Time */}
          {task.specific_time && (
            <p className="text-sm text-foreground-tertiary mt-1">
              {task.specific_time}
            </p>
          )}

          {/* Why (expandable) */}
          {task.why && (
            <button
              onClick={() => setShowWhy(!showWhy)}
              className="flex items-center gap-1 text-sm text-foreground-tertiary mt-2 hover:text-foreground-secondary"
            >
              <span>Why?</span>
              {showWhy ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          {showWhy && task.why && (
            <p className="text-sm text-foreground-secondary mt-2 p-3 rounded-lg bg-surface-secondary">
              {task.why}
            </p>
          )}
        </div>

        {/* Right: Action Buttons */}
        {!status && (
          <div className="flex gap-2">
            <Button
              variant="skip"
              size="icon"
              onClick={() => handleCheckIn('skip')}
              aria-label="Skip task"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
            <Button
              variant="done"
              size="icon"
              onClick={() => handleCheckIn('done')}
              aria-label="Complete task"
            >
              <Check className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Status Indicator (if already checked in) */}
        {status && (
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              status === 'done' && 'bg-done text-white',
              status === 'skip' && 'bg-skip text-white'
            )}
          >
            {status === 'done' ? <Check className="w-5 h-5" /> : <SkipForward className="w-5 h-5" />}
          </div>
        )}
      </div>
    </Card>
  )
}
```

---

## 6.6 Empty State Component

### src/features/today/components/empty-tasks.tsx

```typescript
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function EmptyTasks() {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🌴</div>
      <h3 className="text-xl font-semibold mb-2">No tasks for today</h3>
      <p className="text-foreground-secondary mb-6 max-w-sm mx-auto">
        You haven&apos;t set any tasks for today yet.
        Head to your Roadmap to add tasks to your goals.
      </p>
      <Link href="/roadmap">
        <Button>Go to Roadmap</Button>
      </Link>
    </div>
  )
}
```

---

## 6.7 AI Insight Card

### src/features/today/components/ai-insight-card.tsx

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { X, Sparkles, ChevronRight } from 'lucide-react'
import { useTodayTasks } from '@/queries/use-tasks'

export function AIInsightCard() {
  const [dismissed, setDismissed] = useState(false)
  const { data: tasks = [] } = useTodayTasks()

  // Simple rule-based insight
  const getInsight = () => {
    const completed = tasks.filter((t) => t.check_ins?.[0]?.status === 'done').length
    const total = tasks.length

    if (total === 0) return null

    // Check for high streaks
    const highStreakTask = tasks.find((t) => t.streak_count >= 5 && !t.check_ins?.[0])
    if (highStreakTask) {
      return {
        type: 'streak',
        title: `Keep your ${highStreakTask.streak_count}-day streak going! 🔥`,
        message: `"${highStreakTask.name}" is waiting for you today.`,
      }
    }

    // Morning motivation
    const hour = new Date().getHours()
    if (hour < 12 && completed === 0) {
      return {
        type: 'motivation',
        title: 'Good morning! ☀️',
        message: `You have ${total} tasks today. Start with the easiest one!`,
      }
    }

    // Progress encouragement
    if (completed > 0 && completed < total) {
      return {
        type: 'progress',
        title: `Great progress! ${completed}/${total} done`,
        message: 'Keep going, you\'re doing amazing!',
      }
    }

    // All done celebration
    if (completed === total && total > 0) {
      return {
        type: 'celebration',
        title: 'All tasks completed! 🎉',
        message: 'You\'ve crushed it today. Take a well-deserved rest.',
      }
    }

    return null
  }

  const insight = getInsight()

  if (!insight || dismissed) return null

  return (
    <Card className="bg-ai-bg/50 border border-ai/20 relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-ai/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-ai" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-ai/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-ai" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-ai">{insight.title}</h3>
          <p className="text-sm text-foreground-secondary mt-1">{insight.message}</p>
        </div>
      </div>

      <Link
        href="/ai-hub"
        className="flex items-center gap-1 text-sm text-ai font-medium mt-4 hover:underline"
      >
        <span>Talk to AI</span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    </Card>
  )
}
```

---

## 6.8 Quick Add Button

### src/features/today/components/quick-add-button.tsx

```typescript
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { QuickAddSheet } from './quick-add-sheet'

export function QuickAddButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 lg:bottom-8 w-14 h-14 rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 transition-colors flex items-center justify-center"
        aria-label="Add task"
      >
        <Plus className="w-6 h-6" />
      </button>

      <QuickAddSheet open={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
```

---

## 6.9 Utility Functions

### src/lib/utils/task-utils.ts

```typescript
import type { Task, TimeSlot } from '@/types/entities'

export function groupTasksByTimeSlot(tasks: Task[]): Record<TimeSlot, Task[]> {
  return tasks.reduce(
    (groups, task) => {
      const slot = task.time_slot || 'anytime'
      if (!groups[slot]) groups[slot] = []
      groups[slot].push(task)
      return groups
    },
    {} as Record<TimeSlot, Task[]>
  )
}

export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // Unchecked tasks first
    const aChecked = a.check_ins?.[0]?.status
    const bChecked = b.check_ins?.[0]?.status
    if (aChecked && !bChecked) return 1
    if (!aChecked && bChecked) return -1

    // Then by streak (higher first)
    if (a.streak_count !== b.streak_count) {
      return b.streak_count - a.streak_count
    }

    // Then by sort_order
    return a.sort_order - b.sort_order
  })
}
```

---

## 6.10 Realtime 구독

멀티 탭/디바이스 동기화를 위한 Realtime 구독을 구현합니다.

### Why: 멀티 탭 동기화

```
┌─────────────────────────────────────────────────────────────────┐
│  시나리오: 사용자가 휴대폰에서 체크인 후 PC에서 Today 화면을 봄    │
└─────────────────────────────────────────────────────────────────┘

❌ Realtime 없이:
┌─────────┐     ┌─────────┐
│ 휴대폰  │────►│Supabase │  체크인 완료
│         │     │         │
└─────────┘     └─────────┘
                    │
                    │ (PC는 모름)
                    ▼
┌─────────┐     ┌─────────┐
│   PC    │────►│Supabase │  새로고침 전까지 구 데이터
│(Today)  │◄────│         │
└─────────┘     └─────────┘

✅ Realtime 적용:
┌─────────┐     ┌─────────┐
│ 휴대폰  │────►│Supabase │  체크인 완료
│         │     │         │
└─────────┘     └─────────┘
                    │
                    │  Realtime 이벤트
                    ▼
┌─────────┐     ┌─────────┐
│   PC    │◄────│Supabase │  즉시 UI 업데이트
│(Today)  │     │         │
└─────────┘     └─────────┘
```

### 구독 대상 선정

| 테이블        | Realtime      | 이유                                |
| ------------- | ------------- | ----------------------------------- |
| `check_ins`   | ✅            | 체크인은 즉시 반영 필요             |
| `tasks`       | ✅ (UPDATE만) | 태스크 상태 변경 시                 |
| `goals`       | ❌            | 변경 빈도 낮음 (staleTime으로 충분) |
| `ai_messages` | ✅            | 새 메시지 즉시 알림                 |

### 구현: useRealtimeSync Hook

```typescript
// src/hooks/use-realtime-sync.ts
'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { CheckIn, Task, AIMessage } from '@/types/entities'

export function useRealtimeSync(userId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    // 채널 생성
    const channel = supabase
      .channel(`user:${userId}`)

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Check-ins 변경 구독 (INSERT, UPDATE)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      .on<CheckIn>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          handleCheckInChange(payload, queryClient)
        }
      )

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Tasks 상태 변경 구독 (UPDATE만)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      .on<Task>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          handleTaskChange(payload, queryClient)
        }
      )

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // AI Messages 구독 (INSERT)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      .on<AIMessage>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          handleAIMessageInsert(payload, queryClient)
        }
      )

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Connected to user channel')
        }
      })

    // Cleanup
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 이벤트 핸들러
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function handleCheckInChange(
  payload: RealtimePostgresChangesPayload<CheckIn>,
  queryClient: QueryClient
) {
  const { eventType, new: newRecord } = payload

  // 캐시 직접 업데이트 (invalidate보다 빠름)
  queryClient.setQueryData(queryKeys.dashboard.today, (old: TodayDashboard | undefined) => {
    if (!old) return old

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      return {
        ...old,
        tasks: old.tasks.map((task) =>
          task.id === newRecord.task_id
            ? {
                ...task,
                todayCheckIn: {
                  status: newRecord.status,
                  note: newRecord.note,
                },
              }
            : task
        ),
        stats: {
          ...old.stats,
          completedToday: old.tasks.filter((t) =>
            t.id === newRecord.task_id
              ? newRecord.status === 'done'
              : t.todayCheckIn?.status === 'done'
          ).length,
        },
        recentCheckins: [newRecord, ...old.recentCheckins.slice(0, 19)],
      }
    }

    return old
  })
}

function handleTaskChange(payload: RealtimePostgresChangesPayload<Task>, queryClient: QueryClient) {
  const { new: updatedTask } = payload

  // Tasks 캐시 업데이트
  queryClient.setQueryData(queryKeys.tasks.all, (old: Task[] | undefined) => {
    if (!old) return old
    return old.map((task) => (task.id === updatedTask.id ? { ...task, ...updatedTask } : task))
  })

  // Today Dashboard 캐시도 업데이트
  queryClient.setQueryData(queryKeys.dashboard.today, (old: TodayDashboard | undefined) => {
    if (!old) return old
    return {
      ...old,
      tasks: old.tasks.map((task) =>
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      ),
    }
  })
}

function handleAIMessageInsert(
  payload: RealtimePostgresChangesPayload<AIMessage>,
  queryClient: QueryClient
) {
  const { new: newMessage } = payload

  // AI Messages 캐시에 추가
  queryClient.setQueryData(queryKeys.aiMessages.all, (old: AIMessage[] | undefined) => {
    if (!old) return [newMessage]
    return [newMessage, ...old]
  })

  // Unread count 캐시 업데이트
  queryClient.setQueryData(queryKeys.aiMessages.unread(), (old: AIMessage[] | undefined) => {
    if (!old) return [newMessage]
    return [newMessage, ...old]
  })
}
```

### Today Page에 Realtime 적용

```typescript
// src/app/(main)/today/page.tsx
'use client'

import { useUser } from '@/hooks/use-user'
import { useRealtimeSync } from '@/hooks/use-realtime-sync'
// ... other imports

export default function TodayPage() {
  const { user } = useUser()

  // Realtime 구독 활성화
  useRealtimeSync(user?.id)

  return (
    <PageContainer className="pb-24">
      {/* ... existing content */}
    </PageContainer>
  )
}
```

### Realtime 비용 최적화

```typescript
// src/hooks/use-realtime-sync.ts (확장)

// 비활성 탭에서는 구독 일시 중지
export function useRealtimeSync(userId: string | undefined) {
  const queryClient = useQueryClient()
  const [isTabActive, setIsTabActive] = useState(true)

  // 탭 활성 상태 감지
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    // 비활성 탭이면 구독 안 함
    if (!userId || !isTabActive) return

    const supabase = createClient()
    const channel = supabase.channel(`user:${userId}`)
    // ... subscriptions

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, isTabActive, queryClient])
}
```

---

## 6.11 Testing Requirements

### Unit Tests

| File                                         | Test File               | Coverage Target |
| -------------------------------------------- | ----------------------- | --------------- |
| `lib/utils/task-utils.ts`                    | `task-utils.test.ts`    | 90%             |
| `lib/utils/streak.ts`                        | `streak.test.ts`        | 90%             |
| `features/today/components/today-header.tsx` | `today-header.test.tsx` | 80%             |

### Test Cases for Task Utils

```typescript
// src/lib/utils/__tests__/task-utils.test.ts
import { describe, it, expect } from 'vitest'
import { groupTasksByTimeSlot, sortTasksByPriority, TIME_SLOTS } from '../task-utils'

describe('groupTasksByTimeSlot', () => {
  const mockTasks = [
    { id: '1', name: 'Morning run', time_slot: 'morning', streak_count: 5 },
    { id: '2', name: 'Read book', time_slot: 'evening', streak_count: 3 },
    { id: '3', name: 'Meditate', time_slot: 'morning', streak_count: 10 },
    { id: '4', name: 'No time', time_slot: null, streak_count: 0 },
  ]

  it('groups tasks by time slot', () => {
    const grouped = groupTasksByTimeSlot(mockTasks)
    expect(grouped.morning).toHaveLength(2)
    expect(grouped.evening).toHaveLength(1)
    expect(grouped.anytime).toHaveLength(1)
  })

  it('returns empty groups for missing time slots', () => {
    const grouped = groupTasksByTimeSlot(mockTasks)
    expect(grouped.early_morning).toHaveLength(0)
    expect(grouped.afternoon).toHaveLength(0)
  })

  it('handles empty array', () => {
    const grouped = groupTasksByTimeSlot([])
    expect(Object.values(grouped).every((g) => g.length === 0)).toBe(true)
  })
})

describe('sortTasksByPriority', () => {
  it('puts unchecked tasks before checked', () => {
    const tasks = [
      { id: '1', status: 'done', streak_count: 5, sort_order: 1 },
      { id: '2', status: null, streak_count: 3, sort_order: 2 },
    ]
    const sorted = sortTasksByPriority(tasks)
    expect(sorted[0].id).toBe('2')
  })

  it('sorts by streak count (higher first) among unchecked', () => {
    const tasks = [
      { id: '1', status: null, streak_count: 3, sort_order: 1 },
      { id: '2', status: null, streak_count: 10, sort_order: 2 },
    ]
    const sorted = sortTasksByPriority(tasks)
    expect(sorted[0].id).toBe('2')
  })
})
```

### Integration Tests

| Component       | Test File                   | Test Cases                                |
| --------------- | --------------------------- | ----------------------------------------- |
| TaskCard        | `task-card.test.tsx`        | Render, check-in, animation trigger, ARIA |
| TaskList        | `task-list.test.tsx`        | Group render, empty state, loading        |
| ProgressSummary | `progress-summary.test.tsx` | Calculation accuracy                      |

### TaskCard Integration Test

```typescript
// src/features/today/components/__tests__/task-card.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskCard } from '../task-card'
import { QueryClientProvider } from '@tanstack/react-query'

const mockTask = {
  id: '1',
  name: 'Morning Run',
  emoji: '🏃',
  area: { name: 'Health', color: '#22c55e' },
  goal: { name: 'Get Fit' },
  streak_count: 5,
  why: 'To feel energized',
}

describe('TaskCard', () => {
  it('renders task information', () => {
    render(<TaskCard task={mockTask} />)

    expect(screen.getByText('Morning Run')).toBeInTheDocument()
    expect(screen.getByText('🏃')).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument() // streak
  })

  it('handles Done check-in', async () => {
    const onCheckIn = vi.fn()
    render(<TaskCard task={mockTask} onCheckIn={onCheckIn} />)

    await userEvent.click(screen.getByRole('button', { name: /done/i }))

    expect(onCheckIn).toHaveBeenCalledWith('1', 'done')
  })

  it('handles Skip check-in', async () => {
    const onCheckIn = vi.fn()
    render(<TaskCard task={mockTask} onCheckIn={onCheckIn} />)

    await userEvent.click(screen.getByRole('button', { name: /skip/i }))

    expect(onCheckIn).toHaveBeenCalledWith('1', 'skip')
  })

  it('expands Why section on click', async () => {
    render(<TaskCard task={mockTask} />)

    await userEvent.click(screen.getByText('Get Fit'))

    await waitFor(() => {
      expect(screen.getByText('To feel energized')).toBeVisible()
    })
  })

  it('is keyboard accessible', async () => {
    render(<TaskCard task={mockTask} />)

    await userEvent.tab()
    expect(screen.getByRole('button', { name: /done/i })).toHaveFocus()

    await userEvent.tab()
    expect(screen.getByRole('button', { name: /skip/i })).toHaveFocus()
  })

  it('has correct ARIA attributes', () => {
    render(<TaskCard task={mockTask} />)

    const article = screen.getByRole('article')
    expect(article).toHaveAttribute('aria-labelledby')
  })
})
```

### E2E Tests

| Flow            | Test File                  | Scenarios        |
| --------------- | -------------------------- | ---------------- |
| Check-in Flow   | `checkin.spec.ts`          | Done, Skip, Undo |
| Date Navigation | `today-navigation.spec.ts` | Prev/Next day    |

### Check-in E2E Test

```typescript
// e2e/checkin.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Check-in Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to Today
    await page.goto('/today')
  })

  test('can mark task as done', async ({ page }) => {
    const taskCard = page.locator('[data-testid="task-card"]').first()
    const doneButton = taskCard.locator('button', { hasText: 'Done' })

    await doneButton.click()

    // Verify card style changes
    await expect(taskCard).toHaveClass(/bg-done-bg/)

    // Verify streak updates
    await expect(taskCard.locator('[data-testid="streak-badge"]')).toContainText(/\d+/)

    // Verify particle animation triggered
    await expect(page.locator('[data-testid="particle-burst"]')).toBeVisible()
  })

  test('can skip task', async ({ page }) => {
    const taskCard = page.locator('[data-testid="task-card"]').first()
    const skipButton = taskCard.locator('button', { hasText: 'Skip' })

    await skipButton.click()

    await expect(taskCard).toHaveClass(/bg-skip-bg/)
  })

  test('can undo check-in', async ({ page }) => {
    const taskCard = page.locator('[data-testid="task-card"]').first()

    // First, mark as done
    await taskCard.locator('button', { hasText: 'Done' }).click()

    // Then undo
    await taskCard.locator('button', { hasText: 'Undo' }).click()

    // Verify reverted state
    await expect(taskCard).not.toHaveClass(/bg-done-bg/)
  })

  test('shows confetti on streak milestone', async ({ page }) => {
    // Assumes task with streak 4 exists
    const taskCard = page.locator('[data-testid="task-card"][data-streak="4"]')

    await taskCard.locator('button', { hasText: 'Done' }).click()

    // Verify confetti appears (streak 5 milestone)
    await expect(page.locator('[data-testid="confetti"]')).toBeVisible()
  })

  test('keyboard navigation works', async ({ page }) => {
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Should focus on first Done button
    await expect(page.locator('button:focus')).toHaveText(/Done/i)

    await page.keyboard.press('Enter')

    // Should trigger check-in
    await expect(page.locator('[data-testid="task-card"]').first()).toHaveClass(/bg-done-bg/)
  })
})
```

### Coverage Target

- **Overall Phase 6**: 70%
- **Task Utils**: 90%
- **Components**: 70%
- **E2E**: 2 critical flows

---

## 6.12 상태 관리 (State Management)

현재 날짜 선택 상태를 URL과 동기화하여 브라우저 뒤로가기/앞으로가기 및 공유 가능한 링크를 지원합니다.

### src/features/today/hooks/use-today-date.ts

```typescript
'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { format, parseISO, isValid, startOfDay } from 'date-fns'

export function useTodayDate() {
  const [dateParam, setDateParam] = useQueryState(
    'date',
    parseAsString.withDefault(format(new Date(), 'yyyy-MM-dd'))
  )

  const selectedDate = isValid(parseISO(dateParam)) ? parseISO(dateParam) : new Date()

  const setSelectedDate = (date: Date) => {
    setDateParam(format(date, 'yyyy-MM-dd'))
  }

  const goToToday = () => {
    setDateParam(format(new Date(), 'yyyy-MM-dd'))
  }

  const today = startOfDay(new Date())
  const selected = startOfDay(selectedDate)

  const isViewingToday = selected.getTime() === today.getTime()
  const isViewingPast = selected < today
  const isViewingFuture = selected > today

  return {
    selectedDate,
    setSelectedDate,
    goToToday,
    isViewingToday,
    isViewingPast,
    isViewingFuture,
  }
}
```

### TodayHeader 수정 (useTodayDate 적용)

```typescript
// src/features/today/components/today-header.tsx
'use client'

import { format, addDays, subDays, isToday, isYesterday, isTomorrow } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTodayDate } from '../hooks/use-today-date'
import { cn } from '@/lib/utils'

export function TodayHeader() {
  const {
    selectedDate,
    setSelectedDate,
    goToToday,
    isViewingToday,
  } = useTodayDate()

  const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1))
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1))

  const getDateLabel = (d: Date) => {
    if (isToday(d)) return 'Today'
    if (isYesterday(d)) return 'Yesterday'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'EEEE')
  }

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={handlePrevDay}
        className="p-2 rounded-lg hover:bg-surface-secondary transition-colors touch-target"
        aria-label="Previous day"
      >
        <ChevronLeft className="w-5 h-5 text-foreground-secondary" />
      </button>

      <div className="text-center">
        <h1 className="text-2xl font-bold">{getDateLabel(selectedDate)}</h1>
        <p className="text-sm text-foreground-secondary">
          {format(selectedDate, 'MMMM d, yyyy')}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {!isViewingToday && (
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-primary-500"
          >
            <CalendarDays className="w-4 h-4 mr-1" />
            Today
          </Button>
        )}
        <button
          onClick={handleNextDay}
          className={cn(
            'p-2 rounded-lg hover:bg-surface-secondary transition-colors touch-target',
            isViewingToday && 'opacity-50 cursor-not-allowed'
          )}
          disabled={isViewingToday}
          aria-label="Next day"
        >
          <ChevronRight className="w-5 h-5 text-foreground-secondary" />
        </button>
      </div>
    </div>
  )
}
```

---

## 6.13 에지 케이스 처리

| 케이스               | UI 처리                          | 컴포넌트             |
| -------------------- | -------------------------------- | -------------------- |
| Task 0개             | EmptyTasks 표시                  | `empty-tasks.tsx`    |
| 모든 Task 완료       | 축하 메시지 + AI 카드 강조       | `all-done-state.tsx` |
| 과거 날짜 조회       | 읽기 전용, Done/Skip 버튼 비활성 | `TaskCard` 수정      |
| 미래 날짜 조회       | 예정 Task 미리보기, 체크인 불가  | `TaskCard` 수정      |
| 네트워크 오류        | 토스트 알림 + 재시도 버튼        | `useCheckIn` 수정    |
| 낙관적 업데이트 실패 | 롤백 + 카드 흔들림 애니메이션    | `TaskCard` 수정      |

### src/features/today/components/all-done-state.tsx

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Confetti } from '@/components/ui/animations'

interface AllDoneStateProps {
  taskCount: number
}

export function AllDoneState({ taskCount }: AllDoneStateProps) {
  return (
    <>
      <Confetti trigger={true} />
      <Card variant="hero" className="text-center bg-done-bg/30 border-done/20">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-done">All {taskCount} tasks completed!</h2>
        <p className="text-foreground-secondary mt-2">
          Great job! Take a well-deserved rest.
        </p>
      </Card>
    </>
  )
}
```

### TaskCard 읽기 전용 모드 추가

```typescript
// src/features/today/components/task-card.tsx (수정)

interface TaskCardProps {
  task: Task
  isReadOnly?: boolean  // 과거/미래 날짜일 때 true
}

export function TaskCard({ task, isReadOnly }: TaskCardProps) {
  // ...existing code...

  return (
    <Card
      variant={cardVariant}
      className={cn(
        'relative overflow-visible',
        isReadOnly && 'opacity-70'
      )}
    >
      {/* ...existing content... */}

      {/* 읽기 전용이 아닐 때만 버튼 표시 */}
      {!status && !isReadOnly && (
        <div className="flex gap-2">
          <Button variant="skip" size="icon" onClick={() => handleCheckIn('skip')}>
            <SkipForward className="w-5 h-5" />
          </Button>
          <Button variant="done" size="icon" onClick={() => handleCheckIn('done')}>
            <Check className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* 읽기 전용일 때 상태 표시 */}
      {isReadOnly && !status && (
        <div className="text-sm text-foreground-tertiary italic">
          View only
        </div>
      )}
    </Card>
  )
}
```

### TaskList에 읽기 전용 모드 전달

```typescript
// src/features/today/components/task-list.tsx (수정)

interface TaskListProps {
  isReadOnly?: boolean
}

export function TaskList({ isReadOnly }: TaskListProps) {
  // ...existing code...

  return (
    <div className="space-y-6">
      {timeSlotOrder.map((slot) => {
        // ...existing code...
        return (
          <section key={slot}>
            {/* ... */}
            <div className="space-y-3">
              {slotTasks.map((task) => (
                <TaskCard key={task.id} task={task} isReadOnly={isReadOnly} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
```

---

## 6.14 에러 처리 및 롤백

### src/queries/use-checkin.ts (개선)

```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { checkInService } from '@/services/checkin.service'
import { queryKeys } from '@/lib/query/keys'
import type { CheckInInput, TodayDashboard } from '@/types/entities'

export function useCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: checkInService.create,

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 낙관적 업데이트
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    onMutate: async (newCheckIn: CheckInInput) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({
        queryKey: queryKeys.dashboard.today,
      })

      // 이전 상태 스냅샷
      const previousData = queryClient.getQueryData<TodayDashboard>(queryKeys.dashboard.today)

      // 낙관적으로 캐시 업데이트
      queryClient.setQueryData<TodayDashboard>(queryKeys.dashboard.today, (old) => {
        if (!old) return old

        return {
          ...old,
          tasks: old.tasks.map((task) =>
            task.id === newCheckIn.task_id
              ? {
                  ...task,
                  check_ins: [{ status: newCheckIn.status, date: newCheckIn.date }],
                  streak_count:
                    newCheckIn.status === 'done' ? task.streak_count + 1 : task.streak_count, // skip은 스트릭 유지
                }
              : task
          ),
        }
      })

      return { previousData }
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 에러 시 롤백
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    onError: (error, variables, context) => {
      // 이전 상태로 롤백
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.dashboard.today, context.previousData)
      }

      // 사용자에게 알림
      toast.error('체크인 저장에 실패했습니다', {
        description: '잠시 후 다시 시도해주세요.',
        action: {
          label: '재시도',
          onClick: () => {
            // 재시도: 같은 mutation 다시 실행
          },
        },
      })
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 성공 시
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    onSuccess: (data, variables) => {
      // 마일스톤 축하 (스트릭 5의 배수)
      if (data.streak_count > 0 && data.streak_count % 5 === 0 && variables.status === 'done') {
        toast.success(`🔥 ${data.streak_count}일 연속 달성!`, {
          duration: 5000,
        })
      }
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 완료 후 (성공/실패 무관)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    onSettled: () => {
      // 30초 후 백그라운드 동기화
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.today,
        })
      }, 30000)
    },
  })
}
```

### 에러 시 카드 흔들림 애니메이션

```typescript
// TaskCard에 에러 상태 추가
export function TaskCard({ task, isReadOnly }: TaskCardProps) {
  const [hasError, setHasError] = useState(false)
  const checkIn = useCheckIn()

  const handleCheckIn = (status: CheckInStatus) => {
    checkIn.mutate(
      { task_id: task.id, date: format(new Date(), 'yyyy-MM-dd'), status },
      {
        onError: () => {
          setHasError(true)
          setTimeout(() => setHasError(false), 500)
        },
      }
    )
  }

  return (
    <Card
      className={cn(
        'relative overflow-visible transition-transform',
        hasError && 'animate-shake'
      )}
    >
      {/* ... */}
    </Card>
  )
}
```

### Shake 애니메이션 추가 (tailwind.config.ts)

```typescript
// tailwind.config.ts 의 keyframes에 추가
keyframes: {
  // ...existing keyframes...
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '25%': { transform: 'translateX(-8px)' },
    '50%': { transform: 'translateX(8px)' },
    '75%': { transform: 'translateX(-8px)' },
  },
},
animation: {
  // ...existing animations...
  shake: 'shake 0.4s ease-out',
},
```

---

## 6.15 접근성 (A11y) 상세

### 포커스 관리 훅

```typescript
// src/features/today/hooks/use-focus-management.ts
'use client'

import { useRef, useCallback } from 'react'

export function useFocusManagement() {
  const taskRefs = useRef<Map<string, HTMLElement>>(new Map())

  const setTaskRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      taskRefs.current.set(id, el)
    } else {
      taskRefs.current.delete(id)
    }
  }, [])

  const focusNextTask = useCallback((currentId: string) => {
    const ids = Array.from(taskRefs.current.keys())
    const currentIndex = ids.indexOf(currentId)
    const nextId = ids[currentIndex + 1]

    if (nextId) {
      taskRefs.current.get(nextId)?.focus()
    }
  }, [])

  const focusPrevTask = useCallback((currentId: string) => {
    const ids = Array.from(taskRefs.current.keys())
    const currentIndex = ids.indexOf(currentId)
    const prevId = ids[currentIndex - 1]

    if (prevId) {
      taskRefs.current.get(prevId)?.focus()
    }
  }, [])

  return { setTaskRef, focusNextTask, focusPrevTask }
}
```

### TaskCard ARIA 속성 강화

```typescript
// src/features/today/components/task-card.tsx (ARIA 개선)

export function TaskCard({ task, isReadOnly }: TaskCardProps) {
  const cardId = `task-card-${task.id}`
  const titleId = `${cardId}-title`
  const contextId = `${cardId}-context`

  const status = task.check_ins?.[0]?.status

  return (
    <Card
      role="article"
      aria-labelledby={titleId}
      aria-describedby={contextId}
      data-testid="task-card"
      data-status={status || 'pending'}
      data-streak={task.streak_count}
      tabIndex={0}
      className={cn(/* ... */)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !status && !isReadOnly) {
          e.preventDefault()
          handleCheckIn('done')
        }
        if (e.key === ' ' && !status && !isReadOnly) {
          e.preventDefault()
          handleCheckIn('skip')
        }
      }}
    >
      {/* 스크린 리더용 숨김 컨텍스트 */}
      <span id={contextId} className="sr-only">
        {task.goal?.area?.name} 영역의 {task.goal?.name} 목표에 속한 Task.
        {task.streak_count > 0 && ` 현재 ${task.streak_count}일 연속 진행 중.`}
        {status === 'done' && ' 완료됨.'}
        {status === 'skip' && ' 건너뜀.'}
      </span>

      {/* 제목 */}
      <h3 id={titleId} className={cn(/* ... */)}>
        {task.name}
      </h3>

      {/* 버튼들 */}
      {!status && !isReadOnly && (
        <div className="flex gap-2" role="group" aria-label="체크인 액션">
          <Button
            variant="skip"
            size="icon"
            onClick={() => handleCheckIn('skip')}
            aria-label={`${task.name} 건너뛰기`}
          >
            <SkipForward className="w-5 h-5" aria-hidden="true" />
          </Button>
          <Button
            variant="done"
            size="icon"
            onClick={() => handleCheckIn('done')}
            aria-label={`${task.name} 완료`}
          >
            <Check className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* 라이브 리전 (상태 변경 알림) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {status === 'done' &&
          `${task.name} 완료! ${task.streak_count}일 연속입니다.`}
        {status === 'skip' && `${task.name}을 건너뛰었습니다.`}
      </div>
    </Card>
  )
}
```

### 키보드 단축키 안내

| 키          | 동작                 |
| ----------- | -------------------- |
| `Tab`       | 다음 Task로 이동     |
| `Shift+Tab` | 이전 Task로 이동     |
| `Enter`     | Done (포커스된 Task) |
| `Space`     | Skip (포커스된 Task) |
| `Escape`    | Why 섹션 닫기        |

---

## 6.16 애니메이션 타이밍 명세

### src/lib/constants/animations.ts

```typescript
export const ANIMATION_CONFIG = {
  // 버튼 탭 피드백
  buttonPress: {
    scale: 0.95,
    duration: 50,
    easing: 'ease-out',
  },

  // 카드 상태 전환
  cardStatusChange: {
    duration: 200,
    easing: 'ease-in-out',
  },

  // 스트릭 뱃지 팝
  streakPop: {
    keyframes: [{ scale: 1 }, { scale: 1.3 }, { scale: 1 }],
    duration: 300,
    easing: [0.175, 0.885, 0.32, 1.275], // spring
  },

  // 파티클 버스트
  particleBurst: {
    count: 12,
    spreadRadius: 40,
    duration: 600,
    delay: 100,
    colors: ['#22c55e', '#f59e0b', '#2186ff'],
  },

  // 컨페티 (마일스톤)
  confetti: {
    count: 50,
    duration: 3000,
    colors: ['#22c55e', '#f59e0b', '#2186ff', '#8b5cf6', '#f87171'],
    trigger: (streak: number) => streak > 0 && streak % 5 === 0,
  },

  // 에러 흔들림
  errorShake: {
    keyframes: [{ x: 0 }, { x: -10 }, { x: 10 }, { x: -10 }, { x: 0 }],
    duration: 400,
    easing: 'ease-out',
  },

  // 리스트 재정렬
  listReorder: {
    duration: 300,
    easing: 'ease-out',
    stagger: 50,
  },
} as const

// prefers-reduced-motion 대응
export const REDUCED_MOTION_CONFIG = {
  buttonPress: { scale: 1, duration: 0 },
  cardStatusChange: { duration: 0 },
  streakPop: { keyframes: [{ scale: 1 }], duration: 0 },
  particleBurst: { count: 0 },
  confetti: { count: 0 },
  errorShake: { keyframes: [{ x: 0 }], duration: 0 },
  listReorder: { duration: 0, stagger: 0 },
} as const

export type AnimationConfig = typeof ANIMATION_CONFIG
```

### src/hooks/use-reduced-motion.ts

```typescript
'use client'

import { useState, useEffect } from 'react'
import { ANIMATION_CONFIG, REDUCED_MOTION_CONFIG } from '@/lib/constants/animations'

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const config = prefersReducedMotion ? REDUCED_MOTION_CONFIG : ANIMATION_CONFIG

  return { prefersReducedMotion, config }
}
```

---

## 6.17 성능 최적화

### 가상화 (20개+ Task)

```typescript
// src/features/today/components/virtualized-task-list.tsx
'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { TaskCard } from './task-card'
import type { Task } from '@/types/entities'

const VIRTUALIZATION_THRESHOLD = 20

interface VirtualizedTaskListProps {
  tasks: Task[]
  isReadOnly?: boolean
}

export function VirtualizedTaskList({
  tasks,
  isReadOnly,
}: VirtualizedTaskListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const shouldVirtualize = tasks.length > VIRTUALIZATION_THRESHOLD

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88, // TaskCard 높이 + 간격
    overscan: 5,
    enabled: shouldVirtualize,
  })

  // 가상화 불필요 시 일반 렌더링
  if (!shouldVirtualize) {
    return (
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} isReadOnly={isReadOnly} />
        ))}
      </div>
    )
  }

  // 가상화 렌더링
  return (
    <div ref={parentRef} className="h-[calc(100vh-300px)] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={tasks[virtualItem.index].id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <TaskCard
              task={tasks[virtualItem.index]}
              isReadOnly={isReadOnly}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### TaskCard 메모이제이션

```typescript
// src/features/today/components/task-card.tsx
import { memo } from 'react'

export const TaskCard = memo(
  function TaskCard({ task, isReadOnly }: TaskCardProps) {
    // ... 기존 구현
  },
  (prevProps, nextProps) => {
    // 얕은 비교로 불필요한 리렌더 방지
    return (
      prevProps.task.id === nextProps.task.id &&
      prevProps.task.check_ins?.[0]?.status === nextProps.task.check_ins?.[0]?.status &&
      prevProps.task.streak_count === nextProps.task.streak_count &&
      prevProps.isReadOnly === nextProps.isReadOnly
    )
  }
)
```

### 성능 최적화 체크리스트

- [ ] 가상화: 20개 이상 Task 시 `@tanstack/react-virtual` 적용
- [ ] 메모이제이션: `TaskCard`를 `memo`로 감싸고 비교 함수 제공
- [ ] GPU 가속: 애니메이션에 `transform`, `opacity` 만 사용
- [ ] useReducedMotion: `prefers-reduced-motion` 대응
- [ ] Suspense: TaskList를 Suspense 경계로 감싸서 스트리밍 렌더링

---

## 🤖 AI Testing Verification

Phase 완료 후 Claude가 Playwright MCP로 직접 검증합니다:

```
1. pnpm dev 실행
2. browser_navigate("http://localhost:3000/today")
3. Today 화면 전체 테스트

검증 항목:
- [ ] TodayHeader 날짜 표시 확인 ("Today", "Mon, Feb 3")
- [ ] 날짜 이동 버튼 (<, >) 클릭 테스트
- [ ] ProgressSummary 진행률 바 표시
- [ ] TaskCard 렌더링 확인 (Area Chip, 제목, Streak)
- [ ] TaskCard "Done" 버튼 클릭 → ParticleBurst 애니메이션
- [ ] TaskCard Streak 7 달성 시 Confetti 확인
- [ ] TaskCard "Why?" 섹션 펼침/접기
- [ ] EmptyTasks 상태 (태스크 없을 때)
- [ ] AIInsightCard 표시 확인
- [ ] QuickAddButton FAB 클릭 → 바텀시트 열림

인터랙션 플로우:
1. 첫 번째 TaskCard "Done" 클릭
2. browser_snapshot → 파티클 애니메이션 확인
3. ProgressSummary 업데이트 확인
4. "+" FAB 클릭 → 새 태스크 추가 시트
```

---

## ✅ Completion Checklist

### Core Components (6.1 - 6.9)

- [x] Today page structure
- [x] TodayHeader with date navigation
- [x] ProgressSummary card
- [x] TaskList with time slot grouping
- [x] TaskCard component with:
  - [x] Area chip
  - [x] Streak badge
  - [x] Why expandable section
  - [x] Done/Skip buttons
  - [x] Particle animation on done
  - [x] Confetti on milestone streaks
- [x] EmptyTasks state
- [x] AIInsightCard (rule-based)
- [x] QuickAddButton (FAB)
- [x] Task utility functions

### Realtime (6.10)

- [x] useRealtimeSync hook 구현
- [x] Check-ins 변경 구독
- [x] Tasks 상태 변경 구독
- [x] AI Messages 구독
- [x] 비활성 탭 최적화

### Testing (6.11)

- [ ] Unit tests for task-utils (90% coverage)
- [ ] Integration tests for TaskCard
- [ ] E2E test for check-in flow
- [ ] A11y tests pass

### 상태 관리 (6.12)

- [x] useTodayDate 훅 (nuqs URL 동기화)
- [x] TodayHeader에 훅 적용
- [x] 브라우저 뒤로가기/앞으로가기 지원

### 에지 케이스 처리 (6.13)

- [x] AllDoneState 컴포넌트
- [x] TaskCard 읽기 전용 모드 (과거/미래 날짜)
- [x] TaskList에 isReadOnly prop 전달
- [x] 네트워크 오류 UI

### 에러 처리 및 롤백 (6.14)

- [x] useCheckIn 낙관적 업데이트 개선
- [x] 에러 시 롤백 로직
- [x] 토스트 알림 (sonner)
- [x] 에러 시 카드 흔들림 애니메이션 (animate-shake)
- [x] 마일스톤 축하 토스트

### 접근성 (6.15)

- [x] useFocusManagement 훅
- [x] TaskCard ARIA 속성 (role, aria-labelledby, aria-describedby)
- [x] 키보드 네비게이션 (Tab/Enter/Space/Escape)
- [x] 스크린 리더 라이브 리전 (aria-live)
- [x] touch-target 클래스 적용 (최소 44px)

### 애니메이션 명세 (6.16)

- [x] ANIMATION_CONFIG 상수 정의
- [x] REDUCED_MOTION_CONFIG 상수 정의
- [x] useReducedMotion 훅
- [x] prefers-reduced-motion 미디어 쿼리 대응

### 성능 최적화 (6.17)

- [x] VirtualizedTaskList 컴포넌트 (20개+ Task)
- [x] TaskCard memo 적용 및 비교 함수
- [x] GPU 가속 애니메이션 (transform/opacity)
- [x] Suspense 경계 설정

---

## 🔗 Navigation

← [Phase 5: Onboarding Flow](./phase-5-onboarding.md)
→ [Phase 7: Roadmap Screen](./phase-7-roadmap.md)

---

_Version: 1.0 | Last Updated: 2026-02-03_
