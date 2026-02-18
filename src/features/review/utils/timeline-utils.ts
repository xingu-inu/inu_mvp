import type { MoodLevel, DailyReflection } from '@/types/entities'
import type { DayHistory } from '../hooks/use-checkin-history'
import type { MoodEntry } from '../hooks/use-mood-history'
import type { AreaReviewData } from '../hooks/use-review-roadmap-data'
import type { ActivityEvent } from '../hooks/use-activity-log'
import { MOOD_VALUES, MOOD_EMOJIS, getAvgMoodLabel, MOOD_LABELS } from './review-utils'

// ============================================
// Timeline Entry (Journal tab)
// ============================================

export interface TimelineEntry {
  date: string // YYYY-MM-DD
  mood: MoodLevel | null
  summary: string | null
  completed: number
  total: number
  taskPills: TaskPill[]
}

export interface TaskPill {
  id: string
  name: string
  status: 'done' | 'skip' | 'pending'
  areaEmoji: string
  areaColor: string
}

function buildTaskPillsForDate(date: string, roadmapData: AreaReviewData[]): TaskPill[] {
  const pills: TaskPill[] = []

  for (const areaData of roadmapData) {
    for (const goalData of areaData.goals) {
      for (const task of goalData.tasks) {
        if (task.isCrossLinked) continue
        const checkIn = task.recentCheckIns.find((c) => c.date === date)
        if (checkIn) {
          pills.push({
            id: task.taskId,
            name: task.taskName,
            status: checkIn.status === 'miss' ? 'pending' : checkIn.status,
            areaEmoji: areaData.area.emoji,
            areaColor: areaData.area.color,
          })
        }
      }
    }
  }

  const order: Record<TaskPill['status'], number> = { done: 0, skip: 1, pending: 2 }
  return pills.sort((a, b) => order[a.status] - order[b.status])
}

export function buildTimelineFeed(
  checkInHistory: DayHistory[] | undefined,
  moodHistory: MoodEntry[] | undefined,
  reflections: DailyReflection[] | undefined,
  roadmapData: AreaReviewData[] | undefined
): TimelineEntry[] {
  const dateSet = new Set<string>()

  checkInHistory?.forEach((d) => dateSet.add(d.date))
  moodHistory?.forEach((d) => dateSet.add(d.date))
  reflections?.forEach((d) => dateSet.add(d.date))

  const checkInMap = new Map<string, DayHistory>()
  checkInHistory?.forEach((d) => checkInMap.set(d.date, d))

  const moodMap = new Map<string, MoodLevel>()
  moodHistory?.forEach((d) => moodMap.set(d.date, d.mood))

  const reflectionMap = new Map<string, DailyReflection>()
  reflections?.forEach((d) => reflectionMap.set(d.date, d))

  const entries: TimelineEntry[] = []

  for (const date of dateSet) {
    const checkIn = checkInMap.get(date)
    const mood = moodMap.get(date) ?? null
    const reflection = reflectionMap.get(date)
    const taskPills = roadmapData ? buildTaskPillsForDate(date, roadmapData) : []

    entries.push({
      date,
      mood,
      summary: reflection?.summary ?? null,
      completed: checkIn?.completed ?? 0,
      total: checkIn?.total ?? 0,
      taskPills,
    })
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date))
}

// ============================================
// Period Summary (Journal tab header)
// ============================================

export interface PeriodSummary {
  activeDays: number
  totalDays: number
  avgMoodLabel: string
  longestStreak: number
}

export function computePeriodSummary(
  checkInHistory: DayHistory[] | undefined,
  moodHistory: MoodEntry[] | undefined,
  totalDays: number
): PeriodSummary {
  const activeDays = checkInHistory?.filter((d) => d.completed > 0).length ?? 0

  // Average mood
  let avgMoodLabel = '기록 없음'
  if (moodHistory?.length) {
    const avg = moodHistory.reduce((sum, m) => sum + MOOD_VALUES[m.mood], 0) / moodHistory.length
    avgMoodLabel = MOOD_LABELS[getAvgMoodLabel(avg)]
  }

  // Longest consecutive streak of active days
  let longestStreak = 0
  if (checkInHistory?.length) {
    let current = 0
    // Sort chronologically for streak calculation
    const sorted = [...checkInHistory].sort((a, b) => a.date.localeCompare(b.date))
    for (const day of sorted) {
      if (day.completed > 0) {
        current++
        if (current > longestStreak) longestStreak = current
      } else {
        current = 0
      }
    }
  }

  return { activeDays, totalDays, avgMoodLabel, longestStreak }
}

// ============================================
// Area Changes Summary (Changes tab)
// ============================================

export interface AreaChangesSummary {
  areaId: string
  areaName: string
  areaEmoji: string
  areaColor: string
  areaWhy: string | null
  eventCount: number
  events: ActivityEvent[]
}

export function groupEventsByArea(
  events: ActivityEvent[],
  roadmapData: AreaReviewData[] | undefined
): AreaChangesSummary[] {
  if (!roadmapData) return []

  // Build area lookup
  const areaMap = new Map<
    string,
    { name: string; emoji: string; color: string; why: string | null }
  >()
  for (const areaData of roadmapData) {
    areaMap.set(areaData.area.id, {
      name: areaData.area.name,
      emoji: areaData.area.emoji,
      color: areaData.area.color,
      why: areaData.area.why ?? null,
    })
  }

  // Group events by areaId
  const grouped = new Map<string, ActivityEvent[]>()

  for (const event of events) {
    const areaId = event.areaId
    if (!areaId) continue
    const existing = grouped.get(areaId) ?? []
    existing.push(event)
    grouped.set(areaId, existing)
  }

  // Build summaries for all areas (including ones with 0 events)
  const summaries: AreaChangesSummary[] = []

  for (const areaData of roadmapData) {
    const area = areaData.area
    const areaEvents = grouped.get(area.id) ?? []
    summaries.push({
      areaId: area.id,
      areaName: area.name,
      areaEmoji: area.emoji,
      areaColor: area.color,
      areaWhy: area.why ?? null,
      eventCount: areaEvents.length,
      events: areaEvents,
    })
  }

  // Sort by event count descending
  return summaries.sort((a, b) => b.eventCount - a.eventCount)
}

// ============================================
// Overview Stats (AchievementHero)
// ============================================

export interface OverviewStats {
  completionRate: number
  totalDone: number
  totalScheduled: number
  activeDays: number
  totalDays: number
  avgMoodLabel: string
  avgMoodEmoji: string
  longestStreak: number
  currentStreak: number
}

export function computeOverviewStats(
  checkInHistory: DayHistory[] | undefined,
  moodHistory: MoodEntry[] | undefined,
  totalDays: number
): OverviewStats {
  const days = checkInHistory ?? []
  const totalDone = days.reduce((sum, d) => sum + d.completed, 0)
  const totalScheduled = days.reduce((sum, d) => sum + d.total, 0)
  const completionRate = totalScheduled > 0 ? Math.round((totalDone / totalScheduled) * 100) : 0
  const activeDays = days.filter((d) => d.completed > 0).length

  let avgMoodLabel = '기록 없음'
  let avgMoodEmoji = ''
  if (moodHistory?.length) {
    const avg = moodHistory.reduce((sum, m) => sum + MOOD_VALUES[m.mood], 0) / moodHistory.length
    const moodLevel = getAvgMoodLabel(avg)
    avgMoodLabel = MOOD_LABELS[moodLevel]
    avgMoodEmoji = MOOD_EMOJIS[moodLevel]
  }

  let longestStreak = 0
  let currentStreak = 0
  if (days.length) {
    let current = 0
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
    for (const day of sorted) {
      if (day.completed > 0) {
        current++
        if (current > longestStreak) longestStreak = current
      } else {
        current = 0
      }
    }
    currentStreak = current
  }

  return {
    completionRate,
    totalDone,
    totalScheduled,
    activeDays,
    totalDays,
    avgMoodLabel,
    avgMoodEmoji,
    longestStreak,
    currentStreak,
  }
}

// ============================================
// Active Streaks (AchievementHero streak strip)
// ============================================

export interface ActiveStreak {
  taskId: string
  taskName: string
  streakCount: number
  areaEmoji: string
  areaColor: string
  areaName: string
}

export function extractActiveStreaks(roadmapData: AreaReviewData[] | undefined): ActiveStreak[] {
  if (!roadmapData) return []

  const streaks: ActiveStreak[] = []

  for (const areaData of roadmapData) {
    for (const goalData of areaData.goals) {
      for (const task of goalData.tasks) {
        if (task.isCrossLinked) continue
        if (task.streakCount > 0 && task.isActive) {
          streaks.push({
            taskId: task.taskId,
            taskName: task.taskName,
            streakCount: task.streakCount,
            areaEmoji: areaData.area.emoji,
            areaColor: areaData.area.color,
            areaName: areaData.area.name,
          })
        }
      }
    }
  }

  return streaks.sort((a, b) => b.streakCount - a.streakCount)
}

// ============================================
// Area Balance (AreaBalanceBars)
// ============================================

export interface AreaBalance {
  areaId: string
  areaName: string
  areaEmoji: string
  areaColor: string
  areaWhy: string | null
  completionRate: number
  totalDone: number
  totalScheduled: number
  activeGoals: number
  activeTasks: number
}

export function computeAreaBalance(roadmapData: AreaReviewData[] | undefined): AreaBalance[] {
  if (!roadmapData) return []

  return roadmapData
    .map((areaData) => {
      const activeGoals = areaData.goals.filter((g) => g.goal.status === 'active').length
      let activeTasks = 0
      let totalDone = 0
      let totalScheduled = 0

      for (const goalData of areaData.goals) {
        for (const task of goalData.tasks) {
          if (task.isCrossLinked) continue
          if (task.isActive) {
            activeTasks++
            totalDone += task.totalDone
            totalScheduled += task.totalScheduled
          }
        }
      }

      return {
        areaId: areaData.area.id,
        areaName: areaData.area.name,
        areaEmoji: areaData.area.emoji,
        areaColor: areaData.area.color,
        areaWhy: areaData.area.why,
        completionRate: areaData.periodCompletionRate,
        totalDone,
        totalScheduled,
        activeGoals,
        activeTasks,
      }
    })
    .sort((a, b) => b.completionRate - a.completionRate)
}
