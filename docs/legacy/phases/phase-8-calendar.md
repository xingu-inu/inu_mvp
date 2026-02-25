# Phase 8: Calendar Screen

> **Goal**: Implement calendar views with time slot-based task scheduling

---

## 📚 Reference Documents

- `docs/plan/screens/calendar/spec.md`
- `docs/plan/screens/calendar/wireframe.md`
- `docs/plan/reference/features/time-management.md`

---

## 8.1 Calendar Page Structure

### src/app/(main)/calendar/page.tsx

```typescript
import { Suspense } from 'react'
import { PageContainer } from '@/components/layout/page-container'
import { CalendarHeader } from '@/features/calendar/components/calendar-header'
import { ViewToggle } from '@/features/calendar/components/view-toggle'
import { WeekView } from '@/features/calendar/components/week-view'
import { MonthView } from '@/features/calendar/components/month-view'
import { CalendarSkeleton } from '@/features/calendar/components/calendar-skeleton'

export default function CalendarPage() {
  return (
    <PageContainer className="pb-24">
      <CalendarHeader />

      <div className="mt-4">
        <ViewToggle />
      </div>

      <div className="mt-6">
        <Suspense fallback={<CalendarSkeleton />}>
          <CalendarContent />
        </Suspense>
      </div>
    </PageContainer>
  )
}

function CalendarContent() {
  // View mode from store
  const viewMode = 'week' // From useCalendarStore

  return viewMode === 'week' ? <WeekView /> : <MonthView />
}
```

---

## 8.2 Calendar Store

### src/stores/calendar.store.ts

```typescript
import { create } from 'zustand'
import { startOfWeek, startOfMonth, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns'

type ViewMode = 'week' | 'month'

interface CalendarState {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  currentDate: Date
  setCurrentDate: (date: Date) => void

  selectedDate: Date | null
  setSelectedDate: (date: Date | null) => void

  // Navigation
  goToToday: () => void
  goToPrevious: () => void
  goToNext: () => void
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  viewMode: 'week',
  setViewMode: (mode) => set({ viewMode: mode }),

  currentDate: new Date(),
  setCurrentDate: (date) => set({ currentDate: date }),

  selectedDate: null,
  setSelectedDate: (date) => set({ selectedDate: date }),

  goToToday: () => set({ currentDate: new Date(), selectedDate: new Date() }),

  goToPrevious: () => {
    const { viewMode, currentDate } = get()
    const newDate = viewMode === 'week' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1)
    set({ currentDate: newDate })
  },

  goToNext: () => {
    const { viewMode, currentDate } = get()
    const newDate = viewMode === 'week' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1)
    set({ currentDate: newDate })
  },
}))
```

---

## 8.3 Calendar Header

### src/features/calendar/components/calendar-header.tsx

```typescript
'use client'

import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCalendarStore } from '@/stores/calendar.store'

export function CalendarHeader() {
  const { currentDate, viewMode, goToPrevious, goToNext, goToToday } = useCalendarStore()

  const formatTitle = () => {
    if (viewMode === 'week') {
      return format(currentDate, 'MMMM yyyy')
    }
    return format(currentDate, 'MMMM yyyy')
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={goToPrevious}
          className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={goToNext}
          className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold ml-2">{formatTitle()}</h1>
      </div>

      <Button variant="secondary" size="sm" onClick={goToToday}>
        <CalendarDays className="w-4 h-4 mr-2" />
        Today
      </Button>
    </div>
  )
}
```

---

## 8.4 Week View

### src/features/calendar/components/week-view.tsx

```typescript
'use client'

import { useMemo } from 'react'
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import { useCalendarStore } from '@/stores/calendar.store'
import { useWeekTasks } from '@/features/calendar/hooks/use-week-tasks'
import { TimeSlotRow } from './time-slot-row'
import { cn } from '@/lib/utils'

const TIME_SLOTS = [
  { id: 'early_morning', label: 'Early Morning', time: '5-7', emoji: '☀️' },
  { id: 'morning', label: 'Morning', time: '7-9', emoji: '🌤' },
  { id: 'late_morning', label: 'Late Morning', time: '9-12', emoji: '🌞' },
  { id: 'afternoon', label: 'Afternoon', time: '12-18', emoji: '🌆' },
  { id: 'evening', label: 'Evening', time: '18-21', emoji: '🌙' },
  { id: 'night', label: 'Night', time: '21-24', emoji: '🌙' },
]

export function WeekView() {
  const { currentDate, selectedDate, setSelectedDate } = useCalendarStore()
  const { data: weekTasks = {} } = useWeekTasks(currentDate)

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [currentDate])

  return (
    <div className="overflow-x-auto">
      {/* Day Headers */}
      <div className="grid grid-cols-8 gap-1 mb-2 sticky top-0 bg-surface-primary z-10">
        <div className="p-2" /> {/* Empty corner */}
        {weekDays.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => setSelectedDate(day)}
            className={cn(
              'p-2 rounded-lg text-center transition-colors',
              isToday(day) && 'bg-primary-50',
              selectedDate && isSameDay(day, selectedDate) && 'ring-2 ring-primary-500',
              'hover:bg-surface-secondary'
            )}
          >
            <div className="text-xs text-foreground-secondary">
              {format(day, 'EEE')}
            </div>
            <div
              className={cn(
                'text-lg font-semibold',
                isToday(day) && 'text-primary-500'
              )}
            >
              {format(day, 'd')}
            </div>
          </button>
        ))}
      </div>

      {/* Time Slots */}
      <div className="space-y-1">
        {TIME_SLOTS.map((slot) => (
          <TimeSlotRow
            key={slot.id}
            slot={slot}
            weekDays={weekDays}
            tasks={weekTasks}
          />
        ))}
      </div>
    </div>
  )
}
```

---

## 8.5 Time Slot Row

### src/features/calendar/components/time-slot-row.tsx

```typescript
'use client'

import { format, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/entities'

interface TimeSlotRowProps {
  slot: {
    id: string
    label: string
    time: string
    emoji: string
  }
  weekDays: Date[]
  tasks: Record<string, Task[]>
}

export function TimeSlotRow({ slot, weekDays, tasks }: TimeSlotRowProps) {
  return (
    <div className="grid grid-cols-8 gap-1">
      {/* Time Label */}
      <div className="p-2 text-right">
        <span className="text-xs text-foreground-tertiary">{slot.emoji}</span>
        <div className="text-xs text-foreground-secondary">{slot.time}</div>
      </div>

      {/* Day Cells */}
      {weekDays.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd')
        const dayTasks = tasks[dateKey]?.filter((t) => t.time_slot === slot.id) || []

        return (
          <div
            key={`${slot.id}-${dateKey}`}
            className={cn(
              'min-h-[60px] p-1 rounded-lg border border-border',
              'hover:border-primary-300 transition-colors',
              dayTasks.length > 0 && 'bg-surface-secondary'
            )}
          >
            {dayTasks.map((task) => (
              <TaskPill key={task.id} task={task} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function TaskPill({ task }: { task: Task }) {
  const checkIn = task.check_ins?.[0]
  const status = checkIn?.status

  return (
    <div
      className={cn(
        'text-xs p-1 rounded mb-1 truncate',
        status === 'done' && 'bg-done-bg text-done line-through',
        status === 'skip' && 'bg-skip-bg text-skip',
        !status && 'bg-primary-50 text-primary-600'
      )}
      style={
        task.goal?.area?.color
          ? { backgroundColor: `${task.goal.area.color}20`, color: task.goal.area.color }
          : undefined
      }
    >
      {task.goal?.area?.emoji} {task.name}
    </div>
  )
}
```

---

## 8.6 Month View

### src/features/calendar/components/month-view.tsx

```typescript
'use client'

import { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns'
import { useCalendarStore } from '@/stores/calendar.store'
import { useMonthTasks } from '@/features/calendar/hooks/use-month-tasks'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthView() {
  const { currentDate, selectedDate, setSelectedDate } = useCalendarStore()
  const { data: monthTasks = {} } = useMonthTasks(currentDate)

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })

    const days: Date[] = []
    let day = start
    while (day <= end) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentDate])

  return (
    <div>
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-foreground-secondary"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayTasks = monthTasks[dateKey] || []
          const completedCount = dayTasks.filter(
            (t) => t.check_ins?.[0]?.status === 'done'
          ).length
          const totalCount = dayTasks.length

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDate(day)}
              className={cn(
                'aspect-square p-1 rounded-lg transition-colors relative',
                !isSameMonth(day, currentDate) && 'opacity-40',
                isToday(day) && 'bg-primary-50',
                selectedDate && isSameDay(day, selectedDate) && 'ring-2 ring-primary-500',
                'hover:bg-surface-secondary'
              )}
            >
              <span
                className={cn(
                  'text-sm',
                  isToday(day) && 'text-primary-500 font-bold'
                )}
              >
                {format(day, 'd')}
              </span>

              {/* Task Dots */}
              {totalCount > 0 && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {completedCount > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-done" />
                  )}
                  {totalCount - completedCount > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected Day Tasks */}
      {selectedDate && (
        <SelectedDayTasks
          date={selectedDate}
          tasks={monthTasks[format(selectedDate, 'yyyy-MM-dd')] || []}
        />
      )}
    </div>
  )
}

function SelectedDayTasks({ date, tasks }: { date: Date; tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className="mt-6 p-4 rounded-lg bg-surface-secondary text-center">
        <p className="text-foreground-secondary">
          No tasks for {format(date, 'MMMM d')}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <h3 className="font-semibold mb-3">{format(date, 'EEEE, MMMM d')}</h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="p-3 rounded-lg bg-surface-secondary flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span>{task.goal?.area?.emoji}</span>
              <span>{task.name}</span>
            </div>
            <span className="text-sm text-foreground-tertiary">
              {task.time_slot}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 8.7 Calendar Hooks

### src/features/calendar/hooks/use-week-tasks.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { taskService } from '@/services/task.service'
import type { Task } from '@/types/entities'

export function useWeekTasks(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })

  return useQuery({
    queryKey: ['tasks', 'week', format(start, 'yyyy-MM-dd')],
    queryFn: async () => {
      const tasks = await taskService.getAll()

      // Group by date
      const grouped: Record<string, Task[]> = {}

      // For each day in the week, filter tasks by repeat type
      let currentDay = start
      while (currentDay <= end) {
        const dateStr = format(currentDay, 'yyyy-MM-dd')
        const dayOfWeek = currentDay.getDay()

        grouped[dateStr] = tasks.filter((task) => {
          switch (task.repeat_type) {
            case 'daily':
              return true
            case 'weekdays':
              return dayOfWeek >= 1 && dayOfWeek <= 5
            case 'weekends':
              return dayOfWeek === 0 || dayOfWeek === 6
            case 'weekly':
            case 'custom':
              return task.repeat_days?.includes(dayOfWeek)
            default:
              return false
          }
        })

        currentDay = new Date(currentDay.getTime() + 86400000) // Add 1 day
      }

      return grouped
    },
  })
}
```

### src/features/calendar/hooks/use-month-tasks.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { taskService } from '@/services/task.service'
import type { Task } from '@/types/entities'

export function useMonthTasks(date: Date) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)

  return useQuery({
    queryKey: ['tasks', 'month', format(start, 'yyyy-MM')],
    queryFn: async () => {
      const tasks = await taskService.getAll()

      const grouped: Record<string, Task[]> = {}
      const days = eachDayOfInterval({ start, end })

      days.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayOfWeek = day.getDay()

        grouped[dateStr] = tasks.filter((task) => {
          switch (task.repeat_type) {
            case 'daily':
              return true
            case 'weekdays':
              return dayOfWeek >= 1 && dayOfWeek <= 5
            case 'weekends':
              return dayOfWeek === 0 || dayOfWeek === 6
            case 'weekly':
            case 'custom':
              return task.repeat_days?.includes(dayOfWeek)
            default:
              return false
          }
        })
      })

      return grouped
    },
  })
}
```

---

## 8.8 URL State Synchronization

### src/features/calendar/hooks/use-calendar-state.ts

```typescript
'use client'

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { format, parseISO, isValid, startOfDay } from 'date-fns'
import { useMemo } from 'react'

type ViewMode = 'week' | 'month'

const viewModeParser = parseAsStringLiteral(['week', 'month'] as const).withDefault('week')
const dateParser = parseAsString.withDefault(format(new Date(), 'yyyy-MM-dd'))

export function useCalendarState() {
  const [params, setParams] = useQueryStates({
    view: viewModeParser,
    date: dateParser,
  })

  const currentDate = useMemo(() => {
    const parsed = parseISO(params.date)
    return isValid(parsed) ? parsed : new Date()
  }, [params.date])

  const viewMode = params.view

  const setViewMode = (mode: ViewMode) => {
    setParams({ view: mode })
  }

  const setCurrentDate = (date: Date) => {
    setParams({ date: format(date, 'yyyy-MM-dd') })
  }

  const goToToday = () => {
    setParams({ date: format(new Date(), 'yyyy-MM-dd') })
  }

  const goToPrevious = () => {
    const newDate =
      viewMode === 'week'
        ? new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    setCurrentDate(newDate)
  }

  const goToNext = () => {
    const newDate =
      viewMode === 'week'
        ? new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)
        : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    setCurrentDate(newDate)
  }

  const isViewingCurrentPeriod = useMemo(() => {
    const today = startOfDay(new Date())
    const current = startOfDay(currentDate)
    if (viewMode === 'week') {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay() + 1)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      return current >= weekStart && current <= weekEnd
    }
    return today.getMonth() === current.getMonth() && today.getFullYear() === current.getFullYear()
  }, [currentDate, viewMode])

  return {
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    goToToday,
    goToPrevious,
    goToNext,
    isViewingCurrentPeriod,
  }
}
```

---

## 8.9 View Toggle Component

### src/features/calendar/components/view-toggle.tsx

```typescript
'use client'

import { Calendar, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCalendarState } from '../hooks/use-calendar-state'

export function ViewToggle() {
  const { viewMode, setViewMode } = useCalendarState()

  return (
    <div
      className="inline-flex rounded-lg bg-surface-secondary p-1"
      role="tablist"
      aria-label="Calendar view mode"
    >
      <button
        role="tab"
        aria-selected={viewMode === 'week'}
        onClick={() => setViewMode('week')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
          viewMode === 'week'
            ? 'bg-surface-primary text-foreground shadow-sm'
            : 'text-foreground-secondary hover:text-foreground'
        )}
      >
        <Calendar className="w-4 h-4" aria-hidden="true" />
        <span>Week</span>
      </button>
      <button
        role="tab"
        aria-selected={viewMode === 'month'}
        onClick={() => setViewMode('month')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
          viewMode === 'month'
            ? 'bg-surface-primary text-foreground shadow-sm'
            : 'text-foreground-secondary hover:text-foreground'
        )}
      >
        <CalendarDays className="w-4 h-4" aria-hidden="true" />
        <span>Month</span>
      </button>
    </div>
  )
}
```

---

## 8.10 Calendar Skeleton

### src/features/calendar/components/calendar-skeleton.tsx

```typescript
import { cn } from '@/lib/utils'

interface CalendarSkeletonProps {
  viewMode?: 'week' | 'month'
}

export function CalendarSkeleton({ viewMode = 'week' }: CalendarSkeletonProps) {
  if (viewMode === 'month') {
    return <MonthViewSkeleton />
  }
  return <WeekViewSkeleton />
}

function WeekViewSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Day Headers */}
      <div className="grid grid-cols-8 gap-1 mb-2">
        <div className="p-2" /> {/* Empty corner */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="p-2 text-center">
            <div className="h-3 w-8 bg-surface-tertiary rounded mx-auto mb-1" />
            <div className="h-6 w-6 bg-surface-tertiary rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Time Slots */}
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, slotIndex) => (
          <div key={slotIndex} className="grid grid-cols-8 gap-1">
            {/* Time Label */}
            <div className="p-2 text-right">
              <div className="h-3 w-4 bg-surface-tertiary rounded ml-auto mb-1" />
              <div className="h-3 w-6 bg-surface-tertiary rounded ml-auto" />
            </div>
            {/* Day Cells */}
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <div
                key={dayIndex}
                className="min-h-[60px] p-1 rounded-lg border border-border"
              >
                {/* Random task pills */}
                {Math.random() > 0.7 && (
                  <div className="h-5 bg-surface-tertiary rounded mb-1" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthViewSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="p-2 flex justify-center">
            <div className="h-4 w-8 bg-surface-tertiary rounded" />
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square p-1 rounded-lg border border-border"
          >
            <div className="h-4 w-4 bg-surface-tertiary rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 8.11 Empty States

### src/features/calendar/components/empty-calendar.tsx

```typescript
'use client'

import Link from 'next/link'
import { CalendarOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyCalendar() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mb-4">
        <CalendarOff className="w-8 h-8 text-foreground-tertiary" />
      </div>

      <h3 className="text-lg font-semibold mb-2">
        아직 배치된 Task가 없어요
      </h3>

      <p className="text-foreground-secondary max-w-xs mb-6">
        로드맵에서 Task를 만들고 시간대를 설정하면
        캘린더에 표시됩니다.
      </p>

      <Link href="/roadmap">
        <Button>로드맵에서 Task 추가하기</Button>
      </Link>
    </div>
  )
}
```

---

## 8.12 Action Panel (MVP)

미배치 Task(시간대 미설정)를 표시하는 패널입니다.
MVP에서는 단순 리스트로 표시하고, Phase 2에서 티어 분류와 드래그 배치를 추가합니다.

### src/features/calendar/components/action-panel.tsx

```typescript
'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useUnscheduledTasks } from '../hooks/use-unscheduled-tasks'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/entities'

export function ActionPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { data: tasks = [] } = useUnscheduledTasks()

  if (tasks.length === 0) return null

  return (
    <div
      className={cn(
        'fixed bottom-20 left-0 right-0 lg:bottom-0 lg:left-[200px]',
        'bg-surface-primary border-t border-border',
        'transition-all duration-300',
        isExpanded ? 'h-[50vh]' : 'h-20'
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-secondary transition-colors"
        aria-expanded={isExpanded}
      >
        <span className="font-medium">
          미배치 Task ({tasks.length})
        </span>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-foreground-secondary" />
        ) : (
          <ChevronUp className="w-5 h-5 text-foreground-secondary" />
        )}
      </button>

      {/* Task List */}
      <div className={cn(
        'overflow-hidden transition-all duration-300',
        isExpanded ? 'h-[calc(50vh-48px)] overflow-y-auto' : 'h-8'
      )}>
        {isExpanded ? (
          <ExpandedTaskList tasks={tasks} />
        ) : (
          <CollapsedTaskList tasks={tasks} />
        )}
      </div>
    </div>
  )
}

function CollapsedTaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div className="px-4 flex gap-2 overflow-x-auto pb-2">
      {tasks.slice(0, 5).map((task) => (
        <TaskChip key={task.id} task={task} />
      ))}
      {tasks.length > 5 && (
        <span className="text-sm text-foreground-tertiary whitespace-nowrap self-center">
          +{tasks.length - 5} more
        </span>
      )}
    </div>
  )
}

function ExpandedTaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div className="px-4 py-2 space-y-2">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  )
}

function TaskChip({ task }: { task: Task }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-secondary text-sm whitespace-nowrap"
      style={
        task.goal?.area?.color
          ? { backgroundColor: `${task.goal.area.color}15` }
          : undefined
      }
    >
      <span>{task.goal?.area?.emoji || '📌'}</span>
      <span className="truncate max-w-[100px]">{task.name}</span>
    </div>
  )
}

function TaskRow({ task }: { task: Task }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary hover:bg-surface-tertiary transition-colors cursor-pointer"
      style={
        task.goal?.area?.color
          ? { borderLeft: `3px solid ${task.goal.area.color}` }
          : undefined
      }
    >
      <span className="text-lg">{task.goal?.area?.emoji || '📌'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{task.name}</p>
        {task.goal && (
          <p className="text-sm text-foreground-tertiary truncate">
            {task.goal.name}
          </p>
        )}
      </div>
      {task.duration_minutes && (
        <span className="text-sm text-foreground-tertiary">
          {task.duration_minutes}분
        </span>
      )}
    </div>
  )
}
```

### src/features/calendar/hooks/use-unscheduled-tasks.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { getTasks } from '@/actions/task.actions'

export function useUnscheduledTasks() {
  return useQuery({
    queryKey: [...queryKeys.tasks.all, 'unscheduled'],
    queryFn: async () => {
      const tasks = await getTasks()
      // 시간대가 'anytime'이거나 설정되지 않은 Task
      return tasks.filter((task) => !task.time_slot || task.time_slot === 'anytime')
    },
  })
}
```

---

## 8.13 Testing Requirements

### Unit Tests

| File                          | Test File                    | Coverage Target |
| ----------------------------- | ---------------------------- | --------------- |
| `hooks/use-calendar-state.ts` | `use-calendar-state.test.ts` | 90%             |
| `components/view-toggle.tsx`  | `view-toggle.test.tsx`       | 80%             |

### Test Cases for useCalendarState

```typescript
// src/features/calendar/hooks/__tests__/use-calendar-state.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCalendarState } from '../use-calendar-state'

// nuqs mock
vi.mock('nuqs', () => ({
  useQueryStates: vi.fn(() => [
    {
      view: 'week',
      date: '2026-02-03',
    },
    vi.fn(),
  ]),
  parseAsString: { withDefault: vi.fn() },
  parseAsStringLiteral: vi.fn(() => ({ withDefault: vi.fn() })),
}))

describe('useCalendarState', () => {
  it('returns correct initial state', () => {
    const { result } = renderHook(() => useCalendarState())

    expect(result.current.viewMode).toBe('week')
    expect(result.current.currentDate).toBeInstanceOf(Date)
  })

  it('toggles view mode', () => {
    const setParams = vi.fn()
    vi.mocked(useQueryStates).mockReturnValue([{ view: 'week', date: '2026-02-03' }, setParams])

    const { result } = renderHook(() => useCalendarState())

    act(() => {
      result.current.setViewMode('month')
    })

    expect(setParams).toHaveBeenCalledWith({ view: 'month' })
  })

  it('navigates to previous week', () => {
    const setParams = vi.fn()
    vi.mocked(useQueryStates).mockReturnValue([{ view: 'week', date: '2026-02-03' }, setParams])

    const { result } = renderHook(() => useCalendarState())

    act(() => {
      result.current.goToPrevious()
    })

    expect(setParams).toHaveBeenCalled()
  })

  it('handles invalid date gracefully', () => {
    vi.mocked(useQueryStates).mockReturnValue([{ view: 'week', date: 'invalid-date' }, vi.fn()])

    const { result } = renderHook(() => useCalendarState())

    // Should fallback to current date
    expect(result.current.currentDate).toBeInstanceOf(Date)
  })
})
```

### Integration Tests

```typescript
// src/features/calendar/components/__tests__/week-view.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeekView } from '../week-view'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient()

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('WeekView', () => {
  it('renders 7 day columns', () => {
    render(<WeekView />, { wrapper: Wrapper })

    const dayHeaders = screen.getAllByRole('button', { name: /mon|tue|wed|thu|fri|sat|sun/i })
    expect(dayHeaders).toHaveLength(7)
  })

  it('renders time slots', () => {
    render(<WeekView />, { wrapper: Wrapper })

    expect(screen.getByText(/early morning/i)).toBeInTheDocument()
    expect(screen.getByText(/afternoon/i)).toBeInTheDocument()
  })

  it('selects date on click', async () => {
    const user = userEvent.setup()
    render(<WeekView />, { wrapper: Wrapper })

    const dayButton = screen.getAllByRole('button')[1] // First day
    await user.click(dayButton)

    expect(dayButton).toHaveClass('ring-2')
  })
})
```

### E2E Tests

```typescript
// e2e/calendar.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Calendar Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendar')
  })

  test('switches between week and month view', async ({ page }) => {
    // Default is week view
    await expect(page.getByRole('tab', { name: /week/i })).toHaveAttribute('aria-selected', 'true')

    // Click month tab
    await page.getByRole('tab', { name: /month/i }).click()

    // URL should update
    await expect(page).toHaveURL(/view=month/)

    // Month view should be visible
    await expect(page.getByRole('tab', { name: /month/i })).toHaveAttribute('aria-selected', 'true')
  })

  test('navigates between weeks', async ({ page }) => {
    const initialUrl = page.url()

    await page.getByRole('button', { name: /next/i }).click()

    // URL should change
    expect(page.url()).not.toBe(initialUrl)
  })

  test('goes to today', async ({ page }) => {
    // Navigate away first
    await page.getByRole('button', { name: /previous/i }).click()
    await page.getByRole('button', { name: /previous/i }).click()

    // Click today
    await page.getByRole('button', { name: /today/i }).click()

    // Should highlight today
    await expect(page.locator('[data-today="true"]')).toBeVisible()
  })
})
```

### Coverage Target

- **Overall Phase 8**: 70%
- **Calendar Hooks**: 90%
- **Components**: 70%
- **E2E**: 3 critical flows (view switch, navigation, task display)

---

## 8.14 Accessibility (A11y)

### 캘린더 그리드 ARIA 속성

```typescript
// week-view.tsx 수정
export function WeekView() {
  // ... existing code

  return (
    <div
      className="overflow-x-auto"
      role="grid"
      aria-label="Weekly calendar"
    >
      {/* Day Headers */}
      <div
        className="grid grid-cols-8 gap-1 mb-2 sticky top-0 bg-surface-primary z-10"
        role="row"
      >
        <div className="p-2" role="columnheader" /> {/* Empty corner */}
        {weekDays.map((day) => (
          <button
            key={day.toISOString()}
            role="columnheader"
            aria-label={format(day, 'EEEE, MMMM d')}
            onClick={() => setSelectedDate(day)}
            className={cn(/* ... */)}
          >
            {/* ... */}
          </button>
        ))}
      </div>

      {/* Time Slots */}
      <div className="space-y-1" role="rowgroup">
        {TIME_SLOTS.map((slot) => (
          <TimeSlotRow
            key={slot.id}
            slot={slot}
            weekDays={weekDays}
            tasks={weekTasks}
          />
        ))}
      </div>
    </div>
  )
}
```

### 키보드 네비게이션 훅

```typescript
// src/features/calendar/hooks/use-calendar-keyboard.ts
'use client'

import { useCallback, useEffect } from 'react'
import { addDays, subDays, addWeeks, subWeeks } from 'date-fns'
import { useCalendarState } from './use-calendar-state'

export function useCalendarKeyboard() {
  const { currentDate, setCurrentDate, viewMode, setViewMode } = useCalendarState()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if inside input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          setCurrentDate(subDays(currentDate, 1))
          break
        case 'ArrowRight':
          e.preventDefault()
          setCurrentDate(addDays(currentDate, 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setCurrentDate(subWeeks(currentDate, 1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setCurrentDate(addWeeks(currentDate, 1))
          break
        case 'w':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setViewMode('week')
          }
          break
        case 'm':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setViewMode('month')
          }
          break
        case 't':
          e.preventDefault()
          setCurrentDate(new Date())
          break
      }
    },
    [currentDate, setCurrentDate, setViewMode]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
```

### TaskPill 접근성 개선

```typescript
// time-slot-row.tsx의 TaskPill 수정
function TaskPill({ task }: { task: Task }) {
  const checkIn = task.check_ins?.[0]
  const status = checkIn?.status

  const statusLabel = status === 'done' ? '완료' :
                      status === 'skip' ? '건너뜀' : '미완료'

  return (
    <button
      className={cn(/* ... */)}
      aria-label={`${task.name}, ${task.goal?.area?.name || 'No area'}, ${statusLabel}`}
      data-testid="task-pill"
    >
      <span aria-hidden="true">{task.goal?.area?.emoji}</span>
      <span>{task.name}</span>
    </button>
  )
}
```

### 키보드 단축키 안내

| 키             | 동작        |
| -------------- | ----------- |
| `←`            | 이전 날짜   |
| `→`            | 다음 날짜   |
| `↑`            | 이전 주     |
| `↓`            | 다음 주     |
| `t`            | 오늘로 이동 |
| `Ctrl/Cmd + w` | 주간 뷰     |
| `Ctrl/Cmd + m` | 월간 뷰     |

---

## 8.15 Edge Case Handling

### 에러 상태 컴포넌트

```typescript
// src/features/calendar/components/calendar-error.tsx
'use client'

import { RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface CalendarErrorProps {
  error: Error
  onRetry?: () => void
}

export function CalendarError({ error, onRetry }: CalendarErrorProps) {
  return (
    <Card className="p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-miss-bg flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-miss" />
        </div>
        <div>
          <h3 className="font-semibold mb-1">캘린더를 불러오지 못했어요</h3>
          <p className="text-sm text-foreground-secondary">
            {error.message || '잠시 후 다시 시도해주세요.'}
          </p>
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </Button>
        )}
      </div>
    </Card>
  )
}
```

### Calendar Page with Error Boundary

```typescript
// src/app/(main)/calendar/page.tsx (수정)
'use client'

import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { PageContainer } from '@/components/layout/page-container'
import { CalendarHeader } from '@/features/calendar/components/calendar-header'
import { ViewToggle } from '@/features/calendar/components/view-toggle'
import { WeekView } from '@/features/calendar/components/week-view'
import { MonthView } from '@/features/calendar/components/month-view'
import { ActionPanel } from '@/features/calendar/components/action-panel'
import { CalendarSkeleton } from '@/features/calendar/components/calendar-skeleton'
import { CalendarError } from '@/features/calendar/components/calendar-error'
import { EmptyCalendar } from '@/features/calendar/components/empty-calendar'
import { useCalendarState } from '@/features/calendar/hooks/use-calendar-state'
import { useCalendarKeyboard } from '@/features/calendar/hooks/use-calendar-keyboard'

export default function CalendarPage() {
  const { viewMode } = useCalendarState()

  // Enable keyboard navigation
  useCalendarKeyboard()

  return (
    <PageContainer className="pb-24">
      <CalendarHeader />

      <div className="mt-4">
        <ViewToggle />
      </div>

      <div className="mt-6">
        <ErrorBoundary
          FallbackComponent={({ error, resetErrorBoundary }) => (
            <CalendarError error={error} onRetry={resetErrorBoundary} />
          )}
        >
          <Suspense fallback={<CalendarSkeleton viewMode={viewMode} />}>
            <CalendarContent />
          </Suspense>
        </ErrorBoundary>
      </div>

      <ActionPanel />
    </PageContainer>
  )
}

function CalendarContent() {
  const { viewMode } = useCalendarState()

  return viewMode === 'week' ? <WeekView /> : <MonthView />
}
```

### 에지 케이스 정리

| 케이스          | UI 처리                  | 컴포넌트                |
| --------------- | ------------------------ | ----------------------- |
| Task 0개        | `EmptyCalendar` 표시     | `empty-calendar.tsx`    |
| 로딩 중         | `CalendarSkeleton`       | `calendar-skeleton.tsx` |
| 네트워크 오류   | `CalendarError` + 재시도 | `calendar-error.tsx`    |
| 잘못된 URL date | 현재 날짜로 폴백         | `use-calendar-state.ts` |
| 미배치 Task 0개 | Action Panel 숨김        | `action-panel.tsx`      |

---

## 8.16 Performance Optimization

### TimeSlotRow 메모이제이션

```typescript
// src/features/calendar/components/time-slot-row.tsx (수정)
import { memo } from 'react'

export const TimeSlotRow = memo(
  function TimeSlotRow({ slot, weekDays, tasks }: TimeSlotRowProps) {
    // ... existing implementation
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if tasks changed
    return (
      prevProps.slot.id === nextProps.slot.id &&
      prevProps.weekDays.length === nextProps.weekDays.length &&
      JSON.stringify(prevProps.tasks) === JSON.stringify(nextProps.tasks)
    )
  }
)
```

### TaskPill 메모이제이션

```typescript
// src/features/calendar/components/task-pill.tsx
import { memo } from 'react'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/entities'

interface TaskPillProps {
  task: Task
  onClick?: () => void
}

export const TaskPill = memo(
  function TaskPill({ task, onClick }: TaskPillProps) {
    const checkIn = task.check_ins?.[0]
    const status = checkIn?.status

    return (
      <button
        onClick={onClick}
        className={cn(
          'text-xs p-1 rounded mb-1 truncate w-full text-left',
          status === 'done' && 'bg-done-bg text-done line-through',
          status === 'skip' && 'bg-skip-bg text-skip',
          !status && 'bg-primary-50 text-primary-600'
        )}
        style={
          task.goal?.area?.color
            ? { backgroundColor: `${task.goal.area.color}20`, color: task.goal.area.color }
            : undefined
        }
        data-testid="task-pill"
      >
        <span aria-hidden="true">{task.goal?.area?.emoji}</span>{' '}
        {task.name}
      </button>
    )
  },
  (prev, next) => {
    return (
      prev.task.id === next.task.id &&
      prev.task.check_ins?.[0]?.status === next.task.check_ins?.[0]?.status &&
      prev.task.name === next.task.name
    )
  }
)
```

### 월간 뷰 날짜 셀 메모이제이션

```typescript
// src/features/calendar/components/day-cell.tsx
import { memo } from 'react'
import { format, isSameMonth, isSameDay, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/entities'

interface DayCellProps {
  day: Date
  currentDate: Date
  selectedDate: Date | null
  tasks: Task[]
  onSelect: (date: Date) => void
}

export const DayCell = memo(
  function DayCell({ day, currentDate, selectedDate, tasks, onSelect }: DayCellProps) {
    const completedCount = tasks.filter(
      (t) => t.check_ins?.[0]?.status === 'done'
    ).length
    const totalCount = tasks.length

    return (
      <button
        onClick={() => onSelect(day)}
        className={cn(
          'aspect-square p-1 rounded-lg transition-colors relative',
          !isSameMonth(day, currentDate) && 'opacity-40',
          isToday(day) && 'bg-primary-50',
          selectedDate && isSameDay(day, selectedDate) && 'ring-2 ring-primary-500',
          'hover:bg-surface-secondary'
        )}
        data-today={isToday(day) ? 'true' : undefined}
      >
        <span
          className={cn(
            'text-sm',
            isToday(day) && 'text-primary-500 font-bold'
          )}
        >
          {format(day, 'd')}
        </span>

        {totalCount > 0 && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
            {completedCount > 0 && (
              <div className="w-1.5 h-1.5 rounded-full bg-done" />
            )}
            {totalCount - completedCount > 0 && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
            )}
          </div>
        )}
      </button>
    )
  },
  (prev, next) => {
    return (
      prev.day.getTime() === next.day.getTime() &&
      prev.currentDate.getMonth() === next.currentDate.getMonth() &&
      (prev.selectedDate?.getTime() ?? null) === (next.selectedDate?.getTime() ?? null) &&
      prev.tasks.length === next.tasks.length &&
      prev.tasks.every((t, i) =>
        t.id === next.tasks[i]?.id &&
        t.check_ins?.[0]?.status === next.tasks[i]?.check_ins?.[0]?.status
      )
    )
  }
)
```

### 성능 최적화 체크리스트

- [ ] `TimeSlotRow`를 `memo`로 감싸고 비교 함수 제공
- [ ] `TaskPill`을 별도 파일로 분리하고 `memo` 적용
- [ ] `DayCell`을 별도 파일로 분리하고 `memo` 적용
- [ ] `useCalendarState`에서 불필요한 상태 변경 최소화
- [ ] 주간/월간 Task 쿼리에 적절한 staleTime 설정

---

## 🤖 AI Testing Verification

Phase 완료 후 Claude가 Playwright MCP로 직접 검증합니다:

```
1. pnpm dev 실행
2. browser_navigate("http://localhost:3000/calendar")
3. Calendar 화면 전체 테스트

검증 항목:
- [ ] CalendarHeader 현재 주/월 표시
- [ ] 이전/다음 네비게이션 버튼 동작
- [ ] "Today" 버튼 → 오늘로 이동
- [ ] ViewToggle (Week/Month) 전환
- [ ] WeekView 시간 슬롯 (Morning/Afternoon/Evening/Anytime)
- [ ] TaskPill 태스크 표시 확인
- [ ] MonthView 달력 그리드 렌더링
- [ ] 날짜 클릭 → SelectedDayTasks 패널

Week View 테스트:
1. browser_snapshot → 7일 칼럼 확인
2. 시간 슬롯별 태스크 배치 확인
3. TaskPill 클릭 → 태스크 상세

Month View 테스트:
1. "Month" 버튼 클릭
2. browser_snapshot → 월간 그리드 확인
3. 특정 날짜 클릭 → 해당 날짜 태스크 목록
```

---

## ✅ Completion Checklist

### Core Components (8.1 - 8.7)

- [x] Calendar page structure
- [x] Calendar store (view mode, navigation)
- [x] CalendarHeader with navigation
- [x] ViewToggle (week/month)
- [x] WeekView with time slots
- [x] TimeSlotRow component
- [x] TaskPill component
- [x] MonthView with calendar grid
- [x] SelectedDayTasks panel
- [x] useWeekTasks hook
- [x] useMonthTasks hook

### URL State (8.8)

- [x] useCalendarState hook (nuqs 기반)
- [x] URL에 view=week|month 반영
- [x] URL에 date=YYYY-MM-DD 반영
- [x] 공유 가능한 URL 지원

### UI Components (8.9 - 8.12)

- [x] ViewToggle 컴포넌트 구현
- [x] CalendarSkeleton (주간/월간)
- [x] EmptyCalendar 빈 상태
- [x] ActionPanel (미배치 Task)
- [x] useUnscheduledTasks hook

### Testing (8.13)

- [ ] useCalendarState 단위 테스트 (90% coverage)
- [ ] WeekView 통합 테스트
- [ ] MonthView 통합 테스트
- [ ] E2E: 뷰 전환 테스트
- [ ] E2E: 날짜 네비게이션 테스트

### Accessibility (8.14)

- [x] 캘린더 그리드 ARIA 속성 (role="grid")
- [x] 키보드 네비게이션 (화살표, t, Ctrl+w/m)
- [x] TaskPill aria-label 추가
- [x] 포커스 관리

### Edge Cases (8.15)

- [x] CalendarError 에러 컴포넌트
- [x] ErrorBoundary 적용
- [x] 잘못된 URL date 폴백
- [x] 미배치 Task 0개 시 패널 숨김

### Performance (8.16)

- [x] TimeSlotRow memo 적용
- [x] TaskPill memo 적용
- [x] DayCell memo 적용 (월간 뷰)
- [x] 적절한 staleTime 설정

### Future (Phase 2)

- [ ] Task drag & drop
- [ ] Google Calendar 연동
- [ ] 티어 분류 (핵심/중요/기타)
- [ ] AI 시간 배치 제안

---

## 🔗 Navigation

← [Phase 7: Roadmap Screen](./phase-7-roadmap.md)
→ [Phase 9: Review Screen](./phase-9-review.md)

---

_Version: 1.0 | Last Updated: 2026-02-03_
