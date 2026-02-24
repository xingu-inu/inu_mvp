/**
 * Demo Review Data — Static + dynamic data for the Review tab in demo mode
 * Provides data matching the exact shapes consumed by review hooks/components
 */

import { format, subDays, parseISO, addDays } from 'date-fns'
import type { DayHistory } from '@/features/review/hooks/use-checkin-history'
import type { MoodEntry } from '@/features/review/hooks/use-mood-history'
import type { AreaReviewData } from '@/features/review/hooks/use-review-roadmap-data'
import type { ActivityEvent, ActivityEventType } from '@/features/review/hooks/use-activity-log'
import type { AreaTrendData } from '@/features/review/hooks/use-area-trend'
import type { MoodLevel } from '@/types/entities'
import { DEMO_AREAS, DEMO_GOALS, DEMO_TASKS, DEMO_GROUPS } from './data'

// ============================================
// Helpers
// ============================================

/** Seeded deterministic pseudo-random */
function seededRandom(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return (h >>> 0) / 4294967295
}

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function dateStrDaysAgo(n: number): string {
  return format(subDays(new Date(), n), 'yyyy-MM-dd')
}

// ============================================
// Check-in history (DayHistory[])
// Used by useCheckInHistory → computeOverviewStats, DailyHeatmap
// ============================================

export function generateDemoCheckInHistory(startDate: string, endDate: string): DayHistory[] {
  const result: DayHistory[] = []
  let current = parseISO(startDate)
  const end = parseISO(endDate)
  const today = parseISO(todayStr())

  while (current <= end) {
    const dateStr = format(current, 'yyyy-MM-dd')
    const isPast = current < today
    const isToday = dateStr === todayStr()
    const dow = current.getDay() // 0=Sun

    if (isPast || isToday) {
      const r = seededRandom('checkin-history-' + dateStr)

      // Weekdays are more active than weekends
      const isWeekend = dow === 0 || dow === 6
      const baseTotal = isWeekend ? 4 : 9
      const total = baseTotal + Math.floor(seededRandom('total-' + dateStr) * 3)

      let completed: number
      if (isToday) {
        // Today: partial completion
        completed = Math.floor(total * 0.4 + seededRandom('today-done-' + dateStr) * total * 0.3)
      } else if (r < 0.72) {
        // Good day
        completed = Math.floor(total * (0.7 + seededRandom('good-' + dateStr) * 0.28))
      } else if (r < 0.88) {
        // Medium day
        completed = Math.floor(total * (0.4 + seededRandom('med-' + dateStr) * 0.3))
      } else {
        // Rough day
        completed = Math.floor(total * (0.1 + seededRandom('bad-' + dateStr) * 0.3))
      }

      result.push({ date: dateStr, completed, total })
    }

    current = addDays(current, 1)
  }

  return result
}

// ============================================
// Mood history (MoodEntry[])
// Used by useMoodHistory → CompactSummaryCard, DailyHeatmap
// ============================================

export function generateDemoMoodHistory(startDate: string, endDate: string): MoodEntry[] {
  const result: MoodEntry[] = []
  let current = parseISO(startDate)
  const end = parseISO(endDate)
  const today = parseISO(todayStr())

  while (current <= end) {
    const dateStr = format(current, 'yyyy-MM-dd')
    const isPast = current <= today

    if (isPast) {
      const r = seededRandom('mood-' + dateStr)
      // Distribution: terrible(3%) bad(8%) neutral(18%) good(40%) great(31%)
      let mood: MoodLevel
      if (r < 0.03) mood = 'terrible'
      else if (r < 0.11) mood = 'bad'
      else if (r < 0.29) mood = 'neutral'
      else if (r < 0.69) mood = 'good'
      else mood = 'great'

      // Skip ~25% of days (no reflection logged)
      const logged = seededRandom('mood-logged-' + dateStr)
      if (logged > 0.25) {
        result.push({ date: dateStr, mood })
      }
    }

    current = addDays(current, 1)
  }

  return result
}

// ============================================
// Roadmap review data (AreaReviewData[])
// Used by useReviewRoadmapData → AreaList, computeAreaBalance, extractActiveStreaks
// ============================================

export function generateDemoRoadmapData(): AreaReviewData[] {
  const result: AreaReviewData[] = []

  for (const area of DEMO_AREAS) {
    const areaGoals = DEMO_GOALS.filter((g) => g.area_id === area.id)
    if (areaGoals.length === 0) continue

    const goalDataList = areaGoals
      .filter((g) => ['active', 'backlog', 'paused', 'completed', 'maintenance'].includes(g.status))
      .map((goal) => {
        const goalTasks = DEMO_TASKS.filter(
          (t) => t.goal_id === goal.id && t.is_active && t.status === 'active'
        )
        const goalGroups = DEMO_GROUPS.filter((g) => g.goal_id === goal.id)

        const tasks = goalTasks.map((task) => {
          const streak = task.streak_count
          const totalScheduled = 20 + Math.floor(seededRandom('sched-' + task.id) * 10)
          const totalDone = Math.floor(totalScheduled * (0.5 + (streak / 30) * 0.4))
          const completionRate =
            totalScheduled > 0 ? Math.round((totalDone / totalScheduled) * 100) : 0

          // Build recent check-ins (last 7)
          const recentCheckIns: Array<{ date: string; status: 'done' | 'skip' | 'miss' }> = []
          for (let i = 6; i >= 0; i--) {
            const d = dateStrDaysAgo(i)
            const r = seededRandom('recent-' + task.id + '-' + d)
            let status: 'done' | 'skip' | 'miss'
            if (r < 0.65 + streak * 0.01) status = 'done'
            else if (r < 0.85) status = 'skip'
            else status = 'miss'
            recentCheckIns.push({ date: d, status })
          }

          return {
            taskId: task.id,
            taskName: task.name,
            why: task.why,
            groupId: task.group_id,
            timeSlot: task.time_slot,
            streakCount: streak,
            bestStreak: task.best_streak,
            isActive: true,
            completionRate,
            totalDone,
            totalScheduled,
            recentCheckIns,
            relatedGoalIds: [],
          }
        })

        const activeTasks = tasks
        const goalTotalDone = activeTasks.reduce((s, t) => s + t.totalDone, 0)
        const goalTotalScheduled = activeTasks.reduce((s, t) => s + t.totalScheduled, 0)
        const periodCompletionRate =
          goalTotalScheduled > 0 ? Math.round((goalTotalDone / goalTotalScheduled) * 100) : 0

        return {
          goal: {
            id: goal.id,
            name: goal.name,
            status: goal.status,
            why: goal.why,
            createdAt: goal.created_at,
          },
          groups: goalGroups.map((g) => ({
            id: g.id,
            name: g.name,
            is_completed: g.is_completed,
            sortOrder: g.sort_order,
          })),
          tasks,
          periodCompletionRate,
        }
      })

    const areaTotalDone = goalDataList.reduce(
      (s, g) => s + g.tasks.reduce((ts, t) => ts + t.totalDone, 0),
      0
    )
    const areaTotalScheduled = goalDataList.reduce(
      (s, g) => s + g.tasks.reduce((ts, t) => ts + t.totalScheduled, 0),
      0
    )

    result.push({
      area: {
        id: area.id,
        name: area.name,
        emoji: area.emoji,
        color: area.color,
        why: area.why,
      },
      goals: goalDataList,
      periodCompletionRate:
        areaTotalScheduled > 0 ? Math.round((areaTotalDone / areaTotalScheduled) * 100) : 0,
    })
  }

  return result
}

// ============================================
// Activity events (ActivityEvent[])
// Used by useActivityLog → Journey panel, Activity log
// ============================================

export function generateDemoActivityEvents(): ActivityEvent[] {
  const events: ActivityEvent[] = []

  // Goal created events (2 months ago)
  for (const goal of DEMO_GOALS) {
    const area = DEMO_AREAS.find((a) => a.id === goal.area_id)
    if (!area) continue

    events.push({
      id: `demo-event-goal-created-${goal.id}`,
      date: goal.created_at,
      type: 'goal-created' as ActivityEventType,
      entityName: goal.name,
      areaId: area.id,
      areaEmoji: area.emoji,
    })

    // Completed goals get a completion event
    if (goal.status === 'completed' && goal.completed_at) {
      events.push({
        id: `demo-event-goal-completed-${goal.id}`,
        date: goal.completed_at,
        type: 'goal-completed' as ActivityEventType,
        entityName: goal.name,
        areaId: area.id,
        areaEmoji: area.emoji,
      })
    }
  }

  // Group completed events
  for (const group of DEMO_GROUPS) {
    if (group.is_completed && group.completed_at) {
      const goal = DEMO_GOALS.find((g) => g.id === group.goal_id)
      const area = goal ? DEMO_AREAS.find((a) => a.id === goal.area_id) : null
      if (goal && area) {
        events.push({
          id: `demo-event-group-completed-${group.id}`,
          date: group.completed_at,
          type: 'group-completed' as ActivityEventType,
          entityName: group.name,
          goalName: goal.name,
          areaId: area.id,
          areaEmoji: area.emoji,
        })
      }
    }
  }

  // Task created events
  for (const task of DEMO_TASKS) {
    const goal = task.goal_id ? DEMO_GOALS.find((g) => g.id === task.goal_id) : null
    const area = goal
      ? DEMO_AREAS.find((a) => a.id === goal.area_id)
      : task.area_id
        ? DEMO_AREAS.find((a) => a.id === task.area_id)
        : null

    if (area) {
      events.push({
        id: `demo-event-task-created-${task.id}`,
        date: task.created_at,
        type: 'task-created' as ActivityEventType,
        entityName: task.name,
        goalName: goal?.name,
        areaId: area.id,
        areaEmoji: area.emoji,
      })
    }
  }

  // A few milestone streak events (simulated as task-completed with milestone context)
  const streakMilestones: Array<{ taskId: string; streakVal: number }> = [
    { taskId: 'demo-task-14', streakVal: 25 }, // 명상 10분 — 25일
    { taskId: 'demo-task-4', streakVal: 20 }, // 물 2L — 20일
    { taskId: 'demo-task-12', streakVal: 15 }, // 독서 30분 — 15일
    { taskId: 'demo-task-7', streakVal: 15 }, // 영어 단어 — 15일
    { taskId: 'demo-task-1', streakVal: 10 }, // 매일 30분 러닝 — 10일
  ]

  for (const { taskId, streakVal } of streakMilestones) {
    const task = DEMO_TASKS.find((t) => t.id === taskId)
    if (!task) continue
    const goal = task.goal_id ? DEMO_GOALS.find((g) => g.id === task.goal_id) : null
    const area = goal
      ? DEMO_AREAS.find((a) => a.id === goal.area_id)
      : task.area_id
        ? DEMO_AREAS.find((a) => a.id === task.area_id)
        : null
    if (!area) continue

    const daysAgo = Math.max(1, task.streak_count - streakVal + 1)
    events.push({
      id: `demo-event-streak-${taskId}-${streakVal}`,
      date: format(subDays(new Date(), daysAgo), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      type: 'task-completed' as ActivityEventType,
      entityName: `${task.name} — 🔥${streakVal}일 달성!`,
      goalName: goal?.name,
      areaId: area.id,
      areaEmoji: area.emoji,
    })
  }

  // Sort newest first
  events.sort((a, b) => b.date.localeCompare(a.date))

  return events
}

// ============================================
// Area trend data (AreaTrendData[])
// Used by useAreaTrend → AreaList trend sparklines
// ============================================

export function generateDemoAreaTrends(): AreaTrendData[] {
  return DEMO_AREAS.map((area) => {
    // 6 weekly periods, newest last
    const points = Array.from({ length: 6 }, (_, i) => {
      const weekIndex = 5 - i // 0 = 5 weeks ago, 5 = this week
      const label = weekIndex === 5 ? '이번주' : `${5 - weekIndex}주전`

      // Simulate improving trend over time with some variance
      const baseRate = 45 + weekIndex * 6
      const variance = seededRandom(area.id + '-trend-' + i) * 20 - 10
      const completionRate = Math.max(0, Math.min(100, Math.round(baseRate + variance)))

      return { periodLabel: label, completionRate }
    })

    return {
      areaId: area.id,
      areaName: area.name,
      areaEmoji: area.emoji,
      areaColor: area.color,
      points,
    }
  })
}
