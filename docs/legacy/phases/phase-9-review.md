# Phase 9: Review Screen

> **Goal**: Implement analytics dashboard with statistics, charts, and weekly reflection

---

## 📚 Reference Documents

- `docs/plan/screens/review/spec.md`
- `docs/plan/screens/review/wireframe.md`
- `docs/plan/reference/features/journey-log.md`

---

## 9.1 Review Page Structure

### src/app/(main)/review/page.tsx

```typescript
import { Suspense } from 'react'
import { PageContainer } from '@/components/layout/page-container'
import { ReviewHeader } from '@/features/review/components/review-header'
import { PeriodSelector } from '@/features/review/components/period-selector'
import { OverviewStats } from '@/features/review/components/overview-stats'
import { CheckInChart } from '@/features/review/components/checkin-chart'
import { AreaBreakdown } from '@/features/review/components/area-breakdown'
import { MoodTrend } from '@/features/review/components/mood-trend'
import { WeeklyReflection } from '@/features/review/components/weekly-reflection'
import { GoalProgress } from '@/features/review/components/goal-progress'
import { ReviewSkeleton } from '@/features/review/components/review-skeleton'

export default function ReviewPage() {
  return (
    <PageContainer className="pb-24">
      <ReviewHeader />

      <div className="mt-4">
        <PeriodSelector />
      </div>

      <Suspense fallback={<ReviewSkeleton />}>
        <div className="mt-6 space-y-6">
          <OverviewStats />
          <CheckInChart />
          <AreaBreakdown />
          <MoodTrend />
          <GoalProgress />
          <WeeklyReflection />
        </div>
      </Suspense>
    </PageContainer>
  )
}
```

---

## 9.2 Review Store

### src/stores/review.store.ts

```typescript
import { create } from 'zustand'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns'

type Period = 'week' | 'month'

interface ReviewState {
  period: Period
  setPeriod: (period: Period) => void

  // Computed date range
  getDateRange: () => { start: Date; end: Date }
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  period: 'week',
  setPeriod: (period) => set({ period }),

  getDateRange: () => {
    const { period } = get()
    const now = new Date()

    if (period === 'week') {
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      }
    } else {
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      }
    }
  },
}))
```

---

## 9.3 Overview Stats

### src/features/review/components/overview-stats.tsx

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { useReviewStats } from '@/features/review/hooks/use-review-stats'

export function OverviewStats() {
  const { data: stats, isLoading } = useReviewStats()

  if (isLoading || !stats) return null

  const statItems = [
    {
      label: 'Check-in Rate',
      value: `${stats.checkInRate}%`,
      color: 'text-primary-500',
    },
    {
      label: 'Tasks Completed',
      value: stats.completedTasks,
      subtext: `of ${stats.totalTasks}`,
      color: 'text-done',
    },
    {
      label: 'Current Streak',
      value: stats.currentStreak,
      subtext: 'days',
      color: 'text-streak',
    },
    {
      label: 'Best Streak',
      value: stats.bestStreak,
      subtext: 'days',
      color: 'text-ai',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {statItems.map((item) => (
        <Card key={item.label} className="text-center">
          <div className={`text-3xl font-bold font-mono ${item.color}`}>
            {item.value}
          </div>
          {item.subtext && (
            <div className="text-sm text-foreground-tertiary">{item.subtext}</div>
          )}
          <div className="text-sm text-foreground-secondary mt-1">
            {item.label}
          </div>
        </Card>
      ))}
    </div>
  )
}
```

---

## 9.4 Check-in Chart

### src/features/review/components/checkin-chart.tsx

```typescript
'use client'

import { useMemo } from 'react'
import { format, eachDayOfInterval } from 'date-fns'
import { Card } from '@/components/ui/card'
import { useReviewStore } from '@/stores/review.store'
import { useCheckInHistory } from '@/features/review/hooks/use-checkin-history'
import { cn } from '@/lib/utils'

export function CheckInChart() {
  const { getDateRange } = useReviewStore()
  const { start, end } = getDateRange()
  const { data: history = [] } = useCheckInHistory(start, end)

  const days = useMemo(() => eachDayOfInterval({ start, end }), [start, end])

  const getStatusForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayData = history.find((h) => h.date === dateStr)

    if (!dayData) return 'empty'
    if (dayData.completed === dayData.total) return 'perfect'
    if (dayData.completed > 0) return 'partial'
    return 'missed'
  }

  return (
    <Card>
      <h3 className="font-semibold mb-4">Daily Activity</h3>

      <div className="flex flex-wrap gap-1">
        {days.map((day) => {
          const status = getStatusForDay(day)

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'w-8 h-8 rounded-md flex items-center justify-center text-xs',
                status === 'perfect' && 'bg-done text-white',
                status === 'partial' && 'bg-done/50 text-done',
                status === 'missed' && 'bg-miss-bg text-miss',
                status === 'empty' && 'bg-surface-tertiary text-foreground-tertiary'
              )}
              title={format(day, 'MMM d')}
            >
              {format(day, 'd')}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs text-foreground-secondary">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-done" />
          <span>All done</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-done/50" />
          <span>Partial</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-miss-bg" />
          <span>Missed</span>
        </div>
      </div>
    </Card>
  )
}
```

---

## 9.5 Area Breakdown

### src/features/review/components/area-breakdown.tsx

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress'
import { useAreaStats } from '@/features/review/hooks/use-area-stats'

export function AreaBreakdown() {
  const { data: areaStats = [] } = useAreaStats()

  if (areaStats.length === 0) return null

  // Sort by completion rate
  const sortedStats = [...areaStats].sort((a, b) => b.completionRate - a.completionRate)

  return (
    <Card>
      <h3 className="font-semibold mb-4">Area Performance</h3>

      <div className="space-y-4">
        {sortedStats.map((area) => (
          <div key={area.id}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span>{area.emoji}</span>
                <span className="font-medium">{area.name}</span>
              </div>
              <span className="text-sm text-foreground-secondary">
                {area.completionRate}%
              </span>
            </div>
            <ProgressBar value={area.completionRate} max={100} />
            <div className="flex justify-between text-xs text-foreground-tertiary mt-1">
              <span>{area.completedTasks} completed</span>
              <span>{area.totalTasks} total</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
```

---

## 9.6 Mood Trend

### src/features/review/components/mood-trend.tsx

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { useMoodHistory } from '@/features/review/hooks/use-mood-history'

const MOOD_EMOJIS: Record<string, string> = {
  terrible: '😫',
  bad: '😕',
  neutral: '😐',
  good: '🙂',
  great: '😄',
}

const MOOD_VALUES: Record<string, number> = {
  terrible: 1,
  bad: 2,
  neutral: 3,
  good: 4,
  great: 5,
}

export function MoodTrend() {
  const { data: moodHistory = [] } = useMoodHistory()

  if (moodHistory.length === 0) return null

  const avgMood =
    moodHistory.reduce((sum, m) => sum + MOOD_VALUES[m.mood], 0) / moodHistory.length

  const avgMoodLabel =
    avgMood >= 4.5 ? 'great' :
    avgMood >= 3.5 ? 'good' :
    avgMood >= 2.5 ? 'neutral' :
    avgMood >= 1.5 ? 'bad' : 'terrible'

  return (
    <Card>
      <h3 className="font-semibold mb-4">Mood Trend</h3>

      {/* Average */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <span className="text-4xl">{MOOD_EMOJIS[avgMoodLabel]}</span>
        <div>
          <div className="font-semibold">Average Mood</div>
          <div className="text-sm text-foreground-secondary capitalize">
            {avgMoodLabel}
          </div>
        </div>
      </div>

      {/* Daily Moods */}
      <div className="flex justify-between">
        {moodHistory.slice(-7).map((entry) => (
          <div key={entry.date} className="text-center">
            <div className="text-2xl">{MOOD_EMOJIS[entry.mood]}</div>
            <div className="text-xs text-foreground-tertiary mt-1">
              {new Date(entry.date).toLocaleDateString('en', { weekday: 'short' })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
```

---

## 9.7 Goal Progress

### src/features/review/components/goal-progress.tsx

```typescript
'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress'
import { Chip } from '@/components/ui/chip'
import { useGoals } from '@/queries/use-goals'
import { ChevronRight } from 'lucide-react'

export function GoalProgress() {
  const { data: goals = [] } = useGoals('active')

  if (goals.length === 0) return null

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Active Goals</h3>
        <Link
          href="/roadmap"
          className="text-sm text-primary-500 hover:underline flex items-center"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {goals.slice(0, 3).map((goal) => {
          // Calculate progress based on phases or tasks
          const totalPhases = goal.phases?.length || 0
          const completedPhases = goal.phases?.filter((p) => p.status === 'completed').length || 0
          const progress = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0

          return (
            <div key={goal.id}>
              <div className="flex items-center gap-2 mb-2">
                {goal.area && (
                  <Chip
                    variant="area"
                    emoji={goal.area.emoji}
                    color={goal.area.color}
                  >
                    {goal.area.name}
                  </Chip>
                )}
                <span className="font-medium truncate">{goal.name}</span>
              </div>
              <ProgressBar value={progress} max={100} showLabel />
            </div>
          )
        })}
      </div>
    </Card>
  )
}
```

---

## 9.8 Weekly Reflection

### src/features/review/components/weekly-reflection.tsx

```typescript
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { useWeeklyReflection, useSaveReflection } from '@/features/review/hooks/use-reflection'

export function WeeklyReflection() {
  const { data: reflection } = useWeeklyReflection()
  const saveReflection = useSaveReflection()

  const [isEditing, setIsEditing] = useState(false)
  const [highlights, setHighlights] = useState(reflection?.highlights || '')
  const [improvements, setImprovements] = useState(reflection?.improvements || '')
  const [nextWeekFocus, setNextWeekFocus] = useState(reflection?.next_week_focus || '')

  const handleSave = () => {
    saveReflection.mutate(
      { highlights, improvements, next_week_focus: nextWeekFocus },
      { onSuccess: () => setIsEditing(false) }
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Weekly Reflection</h3>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            {reflection ? 'Edit' : 'Add Reflection'}
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              ✨ What went well this week?
            </label>
            <Textarea
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              placeholder="Your wins and highlights..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              🔧 What could be improved?
            </label>
            <Textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder="Areas for improvement..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              🎯 Focus for next week
            </label>
            <Textarea
              value={nextWeekFocus}
              onChange={(e) => setNextWeekFocus(e.target.value)}
              placeholder="What will you prioritize?"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={saveReflection.isPending}>
              Save Reflection
            </Button>
          </div>
        </div>
      ) : reflection ? (
        <div className="space-y-4">
          {reflection.highlights && (
            <div>
              <div className="text-sm font-medium text-foreground-secondary mb-1">
                ✨ Highlights
              </div>
              <p>{reflection.highlights}</p>
            </div>
          )}
          {reflection.improvements && (
            <div>
              <div className="text-sm font-medium text-foreground-secondary mb-1">
                🔧 Improvements
              </div>
              <p>{reflection.improvements}</p>
            </div>
          )}
          {reflection.next_week_focus && (
            <div>
              <div className="text-sm font-medium text-foreground-secondary mb-1">
                🎯 Next Week Focus
              </div>
              <p>{reflection.next_week_focus}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-foreground-secondary text-center py-4">
          Take a moment to reflect on your week.
        </p>
      )}
    </Card>
  )
}
```

---

## 9.9 Review Data Hooks

### src/features/review/hooks/use-review-stats.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useReviewPeriod } from './use-review-period'
import { queryKeys } from '@/lib/query/keys'

interface ReviewStats {
  checkInRate: number
  completedTasks: number
  totalTasks: number
  currentStreak: number
  bestStreak: number
}

export function useReviewStats() {
  const { getDateRange } = useReviewPeriod()
  const { start, end } = getDateRange()

  return useQuery<ReviewStats>({
    queryKey: queryKeys.review.stats(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')),
    queryFn: async () => {
      const supabase = createClient()

      // 기간 내 체크인 데이터
      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select('status, task_id')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))

      if (error) throw error

      const total = checkIns?.length || 0
      const completed = checkIns?.filter((c) => c.status === 'done').length || 0
      const checkInRate = total > 0 ? Math.round((completed / total) * 100) : 0

      // 스트릭 조회
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_streak, best_streak')
        .single()

      return {
        checkInRate,
        completedTasks: completed,
        totalTasks: total,
        currentStreak: profile?.current_streak || 0,
        bestStreak: profile?.best_streak || 0,
      }
    },
    staleTime: 5 * 60 * 1000, // 5분
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })
}
```

### src/features/review/hooks/use-checkin-history.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import { format, eachDayOfInterval } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'

interface DayHistory {
  date: string
  completed: number
  total: number
}

export function useCheckInHistory(start: Date, end: Date) {
  return useQuery<DayHistory[]>({
    queryKey: queryKeys.review.history(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')),
    queryFn: async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('check_ins')
        .select('date, status')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))

      if (error) throw error

      // 날짜별 그룹핑
      const days = eachDayOfInterval({ start, end })
      return days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayCheckIns = data?.filter((c) => c.date === dateStr) || []
        return {
          date: dateStr,
          completed: dayCheckIns.filter((c) => c.status === 'done').length,
          total: dayCheckIns.length,
        }
      })
    },
    staleTime: 5 * 60 * 1000,
  })
}
```

### src/features/review/hooks/use-area-stats.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useReviewPeriod } from './use-review-period'
import { queryKeys } from '@/lib/query/keys'

interface AreaStat {
  id: string
  name: string
  emoji: string
  color: string
  completionRate: number
  completedTasks: number
  totalTasks: number
}

export function useAreaStats() {
  const { getDateRange } = useReviewPeriod()
  const { start, end } = getDateRange()

  return useQuery<AreaStat[]>({
    queryKey: queryKeys.review.areaStats(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')),
    queryFn: async () => {
      const supabase = createClient()

      const { data: areas, error } = await supabase.from('areas').select(`
          id, name, emoji, color,
          goals (
            tasks (
              check_ins (status, date)
            )
          )
        `)

      if (error) throw error

      return (
        areas?.map((area) => {
          const allCheckIns =
            area.goals?.flatMap(
              (g) =>
                g.tasks?.flatMap(
                  (t) =>
                    t.check_ins?.filter(
                      (c) =>
                        c.date >= format(start, 'yyyy-MM-dd') && c.date <= format(end, 'yyyy-MM-dd')
                    ) || []
                ) || []
            ) || []

          const total = allCheckIns.length
          const completed = allCheckIns.filter((c) => c.status === 'done').length

          return {
            id: area.id,
            name: area.name,
            emoji: area.emoji || '',
            color: area.color,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            completedTasks: completed,
            totalTasks: total,
          }
        }) || []
      )
    },
    staleTime: 5 * 60 * 1000,
  })
}
```

### src/features/review/hooks/use-mood-history.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useReviewPeriod } from './use-review-period'
import { queryKeys } from '@/lib/query/keys'
import type { MoodLevel } from '@/types/entities'

interface MoodEntry {
  date: string
  mood: MoodLevel
}

export function useMoodHistory() {
  const { getDateRange } = useReviewPeriod()
  const { start, end } = getDateRange()

  return useQuery<MoodEntry[]>({
    queryKey: queryKeys.review.moods(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')),
    queryFn: async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('daily_reflections')
        .select('date, mood')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .not('mood', 'is', null)
        .order('date', { ascending: true })

      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}
```

### src/features/review/hooks/use-reflection.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfWeek } from 'date-fns'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query/keys'

interface WeeklyReflection {
  id: string
  week_start: string
  highlights: string | null
  improvements: string | null
  next_week_focus: string | null
  created_at: string
  updated_at: string
}

export function useWeeklyReflection() {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  return useQuery<WeeklyReflection | null>({
    queryKey: queryKeys.review.reflection(weekStart),
    queryFn: async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('weekly_reflections')
        .select('*')
        .eq('week_start', weekStart)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
  })
}

interface SaveReflectionInput {
  highlights?: string
  improvements?: string
  next_week_focus?: string
}

export function useSaveReflection() {
  const queryClient = useQueryClient()
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  return useMutation({
    mutationFn: async (input: SaveReflectionInput) => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('weekly_reflections')
        .upsert({
          week_start: weekStart,
          ...input,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },

    // 낙관적 업데이트
    onMutate: async (newReflection) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.review.reflection(weekStart) })
      const previousData = queryClient.getQueryData(queryKeys.review.reflection(weekStart))

      queryClient.setQueryData(
        queryKeys.review.reflection(weekStart),
        (old: WeeklyReflection | null) => ({
          ...old,
          ...newReflection,
        })
      )

      return { previousData }
    },

    // 에러 시 롤백
    onError: (error, variables, context) => {
      queryClient.setQueryData(queryKeys.review.reflection(weekStart), context?.previousData)
      toast.error('회고 저장에 실패했습니다', {
        description: '잠시 후 다시 시도해주세요.',
      })
    },

    onSuccess: () => {
      toast.success('회고가 저장되었습니다')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.review.reflection(weekStart) })
    },
  })
}
```

### Query Keys 추가 (src/lib/query/keys.ts)

```typescript
export const queryKeys = {
  // ... existing keys
  review: {
    stats: (start: string, end: string) => ['review', 'stats', start, end] as const,
    history: (start: string, end: string) => ['review', 'history', start, end] as const,
    areaStats: (start: string, end: string) => ['review', 'areaStats', start, end] as const,
    moods: (start: string, end: string) => ['review', 'moods', start, end] as const,
    reflection: (weekStart: string) => ['review', 'reflection', weekStart] as const,
  },
}
```

---

## 9.10 Testing Requirements

### Unit Tests

| File                                        | Test File                  | Coverage Target |
| ------------------------------------------- | -------------------------- | --------------- |
| `lib/utils/review-utils.ts`                 | `review-utils.test.ts`     | 90%             |
| `features/review/hooks/use-review-stats.ts` | `use-review-stats.test.ts` | 80%             |

### src/lib/utils/**tests**/review-utils.test.ts

```typescript
import { describe, it, expect } from 'vitest'
import { calculateCheckInRate, getAvgMoodLabel } from '../review-utils'

describe('calculateCheckInRate', () => {
  it('returns 0 when no check-ins', () => {
    expect(calculateCheckInRate(0, 0)).toBe(0)
  })

  it('calculates percentage correctly', () => {
    expect(calculateCheckInRate(7, 10)).toBe(70)
    expect(calculateCheckInRate(3, 4)).toBe(75)
  })

  it('rounds to nearest integer', () => {
    expect(calculateCheckInRate(1, 3)).toBe(33)
    expect(calculateCheckInRate(2, 3)).toBe(67)
  })
})

describe('getAvgMoodLabel', () => {
  it('returns correct label for ranges', () => {
    expect(getAvgMoodLabel(4.8)).toBe('great')
    expect(getAvgMoodLabel(4.0)).toBe('good')
    expect(getAvgMoodLabel(3.0)).toBe('neutral')
    expect(getAvgMoodLabel(2.0)).toBe('bad')
    expect(getAvgMoodLabel(1.2)).toBe('terrible')
  })
})
```

### Integration Tests

| Component        | Test File                    | Test Cases                         |
| ---------------- | ---------------------------- | ---------------------------------- |
| OverviewStats    | `overview-stats.test.tsx`    | Render, loading, error, zero state |
| CheckInChart     | `checkin-chart.test.tsx`     | Day colors, legend, empty state    |
| AreaBreakdown    | `area-breakdown.test.tsx`    | Sort order, progress bars          |
| MoodTrend        | `mood-trend.test.tsx`        | Average display, daily emojis      |
| WeeklyReflection | `weekly-reflection.test.tsx` | Edit mode, save, cancel            |

### src/features/review/components/**tests**/overview-stats.test.tsx

```typescript
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { OverviewStats } from '../overview-stats'
import { vi } from 'vitest'

const mockStats = {
  checkInRate: 75,
  completedTasks: 15,
  totalTasks: 20,
  currentStreak: 7,
  bestStreak: 14,
}

vi.mock('@/features/review/hooks/use-review-stats', () => ({
  useReviewStats: () => ({ data: mockStats, isLoading: false }),
}))

describe('OverviewStats', () => {
  const queryClient = new QueryClient()

  it('renders all stat cards', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <OverviewStats />
      </QueryClientProvider>
    )

    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('of 20')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('applies correct colors', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <OverviewStats />
      </QueryClientProvider>
    )

    const streakValue = screen.getByText('7')
    expect(streakValue).toHaveClass('text-streak')
  })
})
```

### E2E Tests

| Flow            | Test File                   | Scenarios                       |
| --------------- | --------------------------- | ------------------------------- |
| Period Toggle   | `review-period.spec.ts`     | Week ↔ Month 전환, URL 업데이트 |
| Reflection Flow | `review-reflection.spec.ts` | 작성, 저장, 수정, 취소          |

### e2e/review-period.spec.ts

```typescript
import { test, expect } from '@playwright/test'

test.describe('Review Period Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/review')
  })

  test('defaults to week view', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'This Week' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(page.url()).toContain('period=week')
  })

  test('can switch to month view', async ({ page }) => {
    await page.getByRole('button', { name: 'This Month' }).click()

    await expect(page.getByRole('button', { name: 'This Month' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(page.url()).toContain('period=month')
  })

  test('persists period on page reload', async ({ page }) => {
    await page.getByRole('button', { name: 'This Month' }).click()
    await page.reload()

    await expect(page.getByRole('button', { name: 'This Month' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })
})
```

### e2e/review-reflection.spec.ts

```typescript
import { test, expect } from '@playwright/test'

test.describe('Weekly Reflection', () => {
  test('can write and save reflection', async ({ page }) => {
    await page.goto('/review')

    await page.getByRole('button', { name: /Add Reflection|Edit/i }).click()

    await page.getByLabel(/What went well/i).fill('Completed 5-day streak!')
    await page.getByLabel(/What could be improved/i).fill('Need better morning routine')
    await page.getByLabel(/Focus for next week/i).fill('Start tasks earlier')

    await page.getByRole('button', { name: 'Save Reflection' }).click()

    await expect(page.getByText('Completed 5-day streak!')).toBeVisible()
    await expect(page.getByText('회고가 저장되었습니다')).toBeVisible()
  })

  test('can cancel editing', async ({ page }) => {
    await page.goto('/review')

    await page.getByRole('button', { name: /Add Reflection|Edit/i }).click()
    await page.getByLabel(/What went well/i).fill('Test content')
    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByText('Test content')).not.toBeVisible()
  })
})
```

### Coverage Target

- **Overall Phase 9**: 70%
- **Review Utils**: 90%
- **Hooks**: 80%
- **Components**: 70%
- **E2E**: 2 critical flows

---

## 9.11 상태 관리 (URL 동기화)

nuqs를 사용하여 period 상태를 URL과 동기화합니다. 브라우저 히스토리와 공유 링크를 지원합니다.

### src/features/review/hooks/use-review-period.ts

```typescript
'use client'

import { parseAsStringEnum, useQueryState } from 'nuqs'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

type Period = 'week' | 'month'

export function useReviewPeriod() {
  const [period, setPeriod] = useQueryState(
    'period',
    parseAsStringEnum<Period>(['week', 'month']).withDefault('week')
  )

  const getDateRange = () => {
    const now = new Date()

    if (period === 'week') {
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      }
    } else {
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      }
    }
  }

  return {
    period,
    setPeriod,
    getDateRange,
    isWeek: period === 'week',
    isMonth: period === 'month',
  }
}
```

### PeriodSelector 수정 (nuqs 적용)

```typescript
// src/features/review/components/period-selector.tsx
'use client'

import { useReviewPeriod } from '../hooks/use-review-period'
import { cn } from '@/lib/utils'

export function PeriodSelector() {
  const { period, setPeriod } = useReviewPeriod()

  return (
    <div className="flex border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setPeriod('week')}
        className={cn(
          'flex-1 px-4 py-2 text-sm font-medium transition-colors',
          period === 'week'
            ? 'bg-primary-50 text-primary-600'
            : 'text-foreground-secondary hover:bg-surface-secondary'
        )}
        aria-pressed={period === 'week'}
      >
        This Week
      </button>
      <button
        onClick={() => setPeriod('month')}
        className={cn(
          'flex-1 px-4 py-2 text-sm font-medium transition-colors',
          period === 'month'
            ? 'bg-primary-50 text-primary-600'
            : 'text-foreground-secondary hover:bg-surface-secondary'
        )}
        aria-pressed={period === 'month'}
      >
        This Month
      </button>
    </div>
  )
}
```

**URL 동기화 장점:**

- `/review?period=month` 로 직접 접근 가능
- 브라우저 뒤로가기/앞으로가기 지원
- 링크 공유 시 기간 설정 유지

---

## 9.12 에지 케이스 처리

| 케이스                  | UI 처리                     | 컴포넌트           |
| ----------------------- | --------------------------- | ------------------ |
| 데이터 없음 (신규 유저) | EmptyReview 표시            | `empty-review.tsx` |
| 체크인 0건              | "아직 기록이 없어요" 메시지 | `CheckInChart`     |
| Area 0개                | AreaBreakdown 숨김          | `AreaBreakdown`    |
| 목표 0개                | GoalProgress 숨김           | `GoalProgress`     |
| 기분 기록 0건           | MoodTrend 숨김              | `MoodTrend`        |
| 과거 주/월 조회         | Reflection 읽기 전용        | `WeeklyReflection` |
| 네트워크 오류           | 토스트 + 재시도             | 각 컴포넌트        |

### src/features/review/components/empty-review.tsx

```typescript
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function EmptyReview() {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">📊</div>
      <h3 className="text-xl font-semibold mb-2">아직 기록이 없어요</h3>
      <p className="text-foreground-secondary mb-6 max-w-sm mx-auto">
        오늘부터 체크인을 시작하면 여기에 통계가 쌓여요.
        꾸준함이 눈에 보이는 순간을 만나보세요!
      </p>
      <Link href="/today">
        <Button>오늘 시작하기</Button>
      </Link>
    </div>
  )
}
```

### src/features/review/components/no-data-section.tsx

```typescript
'use client'

interface NoDataSectionProps {
  title: string
  message: string
  icon?: string
}

export function NoDataSection({ title, message, icon = '📭' }: NoDataSectionProps) {
  return (
    <div className="text-center py-8 px-4 rounded-2xl bg-surface-secondary">
      <div className="text-3xl mb-2">{icon}</div>
      <h4 className="font-medium text-foreground-secondary">{title}</h4>
      <p className="text-sm text-foreground-tertiary mt-1">{message}</p>
    </div>
  )
}
```

### ReviewPage 조건부 렌더링

```typescript
// src/app/(main)/review/page.tsx (수정)

function ReviewContent() {
  const { data: stats } = useReviewStats()
  const { data: areaStats = [] } = useAreaStats()
  const { data: moodHistory = [] } = useMoodHistory()
  const { data: goals = [] } = useGoals('active')

  // 데이터가 전혀 없으면 Empty State
  const hasAnyData = stats && (stats.totalTasks > 0 || moodHistory.length > 0)

  if (!hasAnyData) {
    return <EmptyReview />
  }

  return (
    <div className="mt-6 space-y-6">
      <OverviewStats />
      <CheckInChart />

      {/* Area가 있을 때만 표시 */}
      {areaStats.length > 0 && <AreaBreakdown />}

      {/* 기분 기록이 있을 때만 표시 */}
      {moodHistory.length > 0 && <MoodTrend />}

      {/* 활성 Goal이 있을 때만 표시 */}
      {goals.length > 0 && <GoalProgress />}

      <WeeklyReflection />
    </div>
  )
}
```

---

## 9.13 에러 처리

### 에러 바운더리

```typescript
// src/features/review/components/review-error-boundary.tsx
'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ReviewErrorBoundary extends Component<Props, State> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="text-center py-12">
          <div className="text-4xl mb-4">😵</div>
          <h3 className="font-semibold mb-2">문제가 발생했어요</h3>
          <p className="text-foreground-secondary mb-4">
            리뷰 데이터를 불러오는 중 오류가 발생했습니다
          </p>
          <Button onClick={() => this.setState({ hasError: false })}>
            다시 시도
          </Button>
        </Card>
      )
    }

    return this.props.children
  }
}
```

### CheckInChart 에러 상태 처리

```typescript
// src/features/review/components/checkin-chart.tsx (에러 처리 추가)

export function CheckInChart() {
  const { getDateRange } = useReviewPeriod()
  const { start, end } = getDateRange()
  const { data: history = [], isLoading, isError, refetch } = useCheckInHistory(start, end)

  if (isLoading) return <ChartSkeleton />

  if (isError) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-foreground-secondary">데이터를 불러올 수 없습니다</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
            다시 시도
          </Button>
        </div>
      </Card>
    )
  }

  const hasData = history.some(h => h.total > 0)

  if (!hasData) {
    return (
      <Card>
        <NoDataSection
          title="체크인 기록 없음"
          message="이 기간에 체크인한 기록이 없어요"
          icon="📅"
        />
      </Card>
    )
  }

  // ... existing render
}
```

---

## 9.14 접근성 (A11y)

### CheckInChart 접근성 강화

```typescript
// src/features/review/components/checkin-chart.tsx (A11y 개선)

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'perfect': return '전체 완료'
    case 'partial': return '일부 완료'
    case 'missed': return '미완료'
    default: return '기록 없음'
  }
}

return (
  <Card>
    <h3 className="font-semibold mb-4" id="checkin-chart-title">Daily Activity</h3>

    <div
      role="grid"
      aria-labelledby="checkin-chart-title"
      className="flex flex-wrap gap-1"
    >
      {days.map((day) => {
        const status = getStatusForDay(day)

        return (
          <div
            key={day.toISOString()}
            role="gridcell"
            aria-label={`${format(day, 'M월 d일')}: ${getStatusLabel(status)}`}
            tabIndex={0}
            className={cn(
              'w-8 h-8 rounded-md flex items-center justify-center text-xs',
              'focus:ring-2 focus:ring-primary-500 focus:outline-none',
              // ... status colors
            )}
          >
            {format(day, 'd')}
          </div>
        )
      })}
    </div>

    {/* Legend with aria */}
    <div className="flex gap-4 mt-4 text-xs text-foreground-secondary" role="list" aria-label="범례">
      <div role="listitem" className="flex items-center gap-1">
        <div className="w-3 h-3 rounded bg-done" aria-hidden="true" />
        <span>전체 완료</span>
      </div>
      {/* ... more legend items */}
    </div>
  </Card>
)
```

### MoodTrend 스크린 리더 지원

```typescript
// src/features/review/components/mood-trend.tsx (A11y 개선)

return (
  <Card>
    <h3 className="font-semibold mb-4">Mood Trend</h3>

    {/* 스크린 리더용 요약 */}
    <div className="sr-only" aria-live="polite">
      이 기간의 평균 기분은 {avgMoodLabel}입니다.
      {moodHistory.length}일 동안 기분을 기록했습니다.
    </div>

    {/* Daily Moods */}
    <div className="flex justify-between" role="list" aria-label="일별 기분">
      {moodHistory.slice(-7).map((entry) => (
        <div
          key={entry.date}
          role="listitem"
          className="text-center"
          aria-label={`${format(new Date(entry.date), 'EEEE')}: ${entry.mood}`}
        >
          <div className="text-2xl" aria-hidden="true">{MOOD_EMOJIS[entry.mood]}</div>
          <div className="text-xs text-foreground-tertiary mt-1">
            {new Date(entry.date).toLocaleDateString('ko', { weekday: 'short' })}
          </div>
        </div>
      ))}
    </div>
  </Card>
)
```

### WeeklyReflection 폼 접근성

```typescript
// src/features/review/components/weekly-reflection.tsx (A11y 개선)

<form
  onSubmit={handleSave}
  aria-labelledby="reflection-title"
  className="space-y-4"
>
  <div>
    <label htmlFor="highlights" className="block text-sm font-medium mb-2">
      ✨ What went well this week?
    </label>
    <Textarea
      id="highlights"
      value={highlights}
      onChange={(e) => setHighlights(e.target.value)}
      placeholder="Your wins and highlights..."
      aria-describedby="highlights-hint"
    />
    <p id="highlights-hint" className="sr-only">
      이번 주 잘한 점이나 성과를 적어주세요
    </p>
  </div>

  {/* ... more fields with proper labels */}

  <div className="flex gap-2" role="group" aria-label="폼 액션">
    <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
      Cancel
    </Button>
    <Button type="submit" isLoading={saveReflection.isPending}>
      Save Reflection
    </Button>
  </div>
</form>
```

### 키보드 단축키

| 키        | 동작                              |
| --------- | --------------------------------- |
| `Tab`     | 섹션/컨트롤 간 이동               |
| `←` / `→` | PeriodSelector 전환 (포커스 시)   |
| `Enter`   | 버튼 활성화, Reflection 편집 시작 |
| `Escape`  | Reflection 편집 취소              |

---

## 9.15 성능 최적화

### 차트 컴포넌트 Dynamic Import

```typescript
// src/app/(main)/review/page.tsx
import dynamic from 'next/dynamic'

const CheckInChart = dynamic(
  () => import('@/features/review/components/checkin-chart').then(mod => ({ default: mod.CheckInChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const MoodTrend = dynamic(
  () => import('@/features/review/components/mood-trend').then(mod => ({ default: mod.MoodTrend })),
  { loading: () => <ChartSkeleton height={160} />, ssr: false }
)
```

### 컴포넌트 메모이제이션

```typescript
// src/features/review/components/area-breakdown.tsx
import { memo, useMemo } from 'react'

export const AreaBreakdown = memo(function AreaBreakdown() {
  const { data: areaStats = [] } = useAreaStats()

  // 정렬 결과 메모이제이션
  const sortedStats = useMemo(
    () => [...areaStats].sort((a, b) => b.completionRate - a.completionRate),
    [areaStats]
  )

  // ... render
})
```

### 데이터 계산 메모이제이션

```typescript
// src/features/review/components/checkin-chart.tsx

export function CheckInChart() {
  const { getDateRange } = useReviewPeriod()
  const { start, end } = getDateRange()
  const { data: history = [] } = useCheckInHistory(start, end)

  // 날짜 배열 메모이제이션
  const days = useMemo(() => eachDayOfInterval({ start, end }), [start, end])

  // 상태 맵 메모이제이션
  const statusMap = useMemo(() => {
    const map = new Map<string, string>()
    history.forEach((h) => {
      if (h.total === 0) map.set(h.date, 'empty')
      else if (h.completed === h.total) map.set(h.date, 'perfect')
      else if (h.completed > 0) map.set(h.date, 'partial')
      else map.set(h.date, 'missed')
    })
    return map
  }, [history])

  // ...
}
```

---

## 9.16 Review Skeleton

### src/features/review/components/review-skeleton.tsx

```typescript
'use client'

import { Card } from '@/components/ui/card'

export function ReviewSkeleton() {
  return (
    <div className="mt-6 space-y-6 animate-pulse">
      {/* Overview Stats Skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="text-center">
            <div className="h-8 w-16 bg-surface-tertiary rounded mx-auto mb-2" />
            <div className="h-4 w-12 bg-surface-tertiary rounded mx-auto mb-1" />
            <div className="h-3 w-20 bg-surface-tertiary rounded mx-auto" />
          </Card>
        ))}
      </div>

      {/* Chart Skeleton */}
      <Card>
        <div className="h-5 w-24 bg-surface-tertiary rounded mb-4" />
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="w-8 h-8 bg-surface-tertiary rounded-md" />
          ))}
        </div>
      </Card>

      {/* Area Breakdown Skeleton */}
      <Card>
        <div className="h-5 w-32 bg-surface-tertiary rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="flex justify-between mb-2">
                <div className="h-4 w-20 bg-surface-tertiary rounded" />
                <div className="h-4 w-8 bg-surface-tertiary rounded" />
              </div>
              <div className="h-2 bg-surface-tertiary rounded-full" />
            </div>
          ))}
        </div>
      </Card>

      {/* Reflection Skeleton */}
      <Card>
        <div className="h-5 w-28 bg-surface-tertiary rounded mb-4" />
        <div className="h-24 bg-surface-tertiary rounded" />
      </Card>
    </div>
  )
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <Card className="animate-pulse">
      <div className="h-5 w-24 bg-surface-tertiary rounded mb-4" />
      <div style={{ height }} className="bg-surface-tertiary rounded-lg" />
    </Card>
  )
}
```

---

## 🤖 AI Testing Verification

Phase 완료 후 Claude가 Playwright MCP로 직접 검증합니다:

```
1. pnpm dev 실행
2. browser_navigate("http://localhost:3000/review")
3. Review 화면 전체 테스트

검증 항목:
- [ ] PeriodSelector (This Week/This Month) 전환
- [ ] OverviewStats 카드 (체크인율, 스트릭)
- [ ] CheckInChart 히트맵 렌더링
- [ ] AreaBreakdown 영역별 통계
- [ ] MoodTrend 차트 (있는 경우)
- [ ] GoalProgress 목표별 진행률

Period 전환 테스트:
1. "This Week" → 주간 통계 확인
2. "This Month" 클릭 → 월간 통계 확인
3. 데이터 변경 확인

WeeklyReflection 테스트:
1. "Write Reflection" 버튼 클릭
2. browser_type으로 회고 작성
3. 저장 후 표시 확인
```

---

## ✅ Completion Checklist

### Core Components (9.1 - 9.8)

- [x] Review page structure
- [x] Review store (period selection)
- [x] PeriodSelector (week/month)
- [x] OverviewStats (check-in rate, streaks)
- [x] CheckInChart (activity heatmap)
- [x] AreaBreakdown (per-area stats)
- [x] MoodTrend visualization
- [x] GoalProgress cards
- [x] WeeklyReflection form

### Review Hooks (9.9)

- [x] useReviewStats hook
- [x] useCheckInHistory hook
- [x] useAreaStats hook
- [x] useMoodHistory hook
- [x] useWeeklyReflection hook
- [x] useSaveReflection mutation
- [x] Query keys 추가

### Testing (9.10)

- [ ] Unit tests for review-utils (90% coverage)
- [ ] Integration tests for OverviewStats
- [ ] Integration tests for CheckInChart
- [ ] Integration tests for WeeklyReflection
- [ ] E2E test for period toggle
- [ ] E2E test for reflection flow

### URL 상태 관리 (9.11)

- [x] useReviewPeriod 훅 (nuqs)
- [x] PeriodSelector nuqs 적용
- [x] 브라우저 히스토리 지원 확인

### 에지 케이스 (9.12)

- [x] EmptyReview 컴포넌트
- [x] NoDataSection 컴포넌트
- [x] 조건부 섹션 렌더링 (Area, Mood, Goal)
- [x] 에러 상태 UI

### 에러 처리 (9.13)

- [x] useSaveReflection 낙관적 업데이트
- [x] 에러 롤백 로직
- [x] 토스트 알림 (sonner)
- [x] ReviewErrorBoundary

### 접근성 (9.14)

- [x] CheckInChart ARIA (role=grid, gridcell)
- [x] MoodTrend 스크린 리더 지원
- [x] WeeklyReflection 폼 레이블
- [x] 키보드 네비게이션

### 성능 (9.15)

- [x] 차트 컴포넌트 dynamic import
- [x] AreaBreakdown memo
- [x] useMemo for expensive calculations

### Skeleton (9.16)

- [x] ReviewSkeleton 구현
- [x] ChartSkeleton 구현

---

## 📁 파일 구조

```
src/features/review/
├── components/
│   ├── review-header.tsx
│   ├── period-selector.tsx
│   ├── overview-stats.tsx
│   ├── checkin-chart.tsx
│   ├── area-breakdown.tsx
│   ├── mood-trend.tsx
│   ├── goal-progress.tsx
│   ├── weekly-reflection.tsx
│   ├── review-skeleton.tsx
│   ├── empty-review.tsx
│   ├── no-data-section.tsx
│   ├── review-error-boundary.tsx
│   └── __tests__/
│       ├── overview-stats.test.tsx
│       ├── checkin-chart.test.tsx
│       └── weekly-reflection.test.tsx
├── hooks/
│   ├── use-review-period.ts
│   ├── use-review-stats.ts
│   ├── use-checkin-history.ts
│   ├── use-area-stats.ts
│   ├── use-mood-history.ts
│   └── use-reflection.ts
└── utils/
    ├── review-utils.ts
    └── __tests__/
        └── review-utils.test.ts

e2e/
├── review-period.spec.ts
└── review-reflection.spec.ts
```

---

## 🔗 Navigation

← [Phase 8: Calendar Screen](./phase-8-calendar.md)
→ [Phase 10: Secondary Screens](./phase-10-secondary.md)

---

_Version: 2.0 | Last Updated: 2026-02-04_

**Changes in v2.0:**

- Added 9.9: Review Data Hooks (all hook implementations)
- Added 9.10: Testing Requirements (unit, integration, E2E tests)
- Added 9.11: URL State Management (nuqs integration)
- Added 9.12: Edge Case Handling (empty states, conditional rendering)
- Added 9.13: Error Handling (optimistic updates, rollback, error boundary)
- Added 9.14: Accessibility (ARIA, screen reader, keyboard navigation)
- Added 9.15: Performance Optimization (dynamic import, memo, useMemo)
- Added 9.16: Review Skeleton components
- Updated Completion Checklist with new sections
- Added file structure reference
