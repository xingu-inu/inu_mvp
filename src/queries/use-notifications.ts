'use client'

import { useQuery } from '@tanstack/react-query'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import {
  computeNotifications,
  countActionableNotifications,
  type WeeklyStats,
  type GoalWeeklyStats,
} from '@/lib/notifications'
import { unwrapListResponse, unwrapResponse } from '@/lib/api'
import { mapApiTasksToEntities } from '@/lib/utils/task-utils'
import { getHomeTasks, getWeekHomeTasks } from '@/actions/home.actions'
import { getActiveGoalsMinimal } from '@/actions/goal.actions'
import { getActiveAnnouncements } from '@/actions/announcement.actions'
import type { AppNotification } from '@/types/entities'
import type { Announcement } from '@/repositories/announcement.repository'
import type { MinimalGoal } from '@/repositories/goal.repository'

const DISMISSED_KEY = 'inu-dismissed-announcements'
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

interface DismissedEntry {
  id: string
  at: number
}

function parseDismissedEntries(raw: string | null): DismissedEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as DismissedEntry[] | string[]
    if (parsed.length === 0) return []
    // Migrate legacy string[] format
    if (typeof parsed[0] === 'string') {
      return (parsed as string[]).map((id) => ({ id, at: Date.now() }))
    }
    return parsed as DismissedEntry[]
  } catch {
    return []
  }
}

function getDismissedIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const entries = parseDismissedEntries(localStorage.getItem(DISMISSED_KEY))
    if (entries.length === 0) return []
    // Auto-prune entries older than 30 days
    const now = Date.now()
    const valid = entries.filter((e) => now - e.at < THIRTY_DAYS)
    if (valid.length < entries.length) {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(valid))
    }
    return valid.map((e) => e.id)
  } catch {
    return []
  }
}

export function dismissAnnouncement(id: string) {
  const entries = parseDismissedEntries(localStorage.getItem(DISMISSED_KEY))
  if (!entries.some((e) => e.id === id)) {
    entries.push({ id, at: Date.now() })
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(entries))
  }
}

const ANNOUNCEMENT_EMOJI: Record<string, string> = {
  info: '\u{1F4E2}',
  update: '\u{1F195}',
  event: '\u{1F389}',
}

function mapAnnouncementsToNotifications(announcements: Announcement[]): AppNotification[] {
  const dismissedIds = getDismissedIds()
  return announcements
    .filter((a) => !dismissedIds.includes(a.id))
    .map((a) => ({
      id: `announcement-${a.id}`,
      type: 'announcement' as const,
      title: a.title,
      message: a.content,
      emoji: ANNOUNCEMENT_EMOJI[a.type] ?? '\u{1F4E2}',
      priority: 5,
      autoResolve: false,
    }))
}

async function fetchNotifications(): Promise<AppNotification[]> {
  const today = new Date()
  const dateStr = format(today, 'yyyy-MM-dd')
  const isMonday = today.getDay() === 1

  // Core data — use lightweight goal query (no groups/tasks join)
  const [tasksResponse, goalsResponse, announcementsResponse] = await Promise.all([
    getHomeTasks(dateStr),
    getActiveGoalsMinimal(),
    getActiveAnnouncements(),
  ])

  const apiTasks = unwrapListResponse(tasksResponse)
  const todayTasks = mapApiTasksToEntities(apiTasks)

  const activeGoals: MinimalGoal[] = goalsResponse.success ? goalsResponse.data : []

  // Weekly data (conditional)
  let lastWeekStats: WeeklyStats | undefined
  let goalStats: GoalWeeklyStats[] | undefined

  // Fetch last week stats on Mondays
  if (isMonday) {
    const lastWeek = subWeeks(today, 1)
    const weekStart = format(startOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd = format(endOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')

    const weekResponse = await getWeekHomeTasks(weekStart, weekEnd)
    if (weekResponse.success && weekResponse.data) {
      const allWeekTasks = Object.values(weekResponse.data).flat()
      const totalDone = allWeekTasks.filter((t) => t.todayCheckIn?.status === 'done').length
      const totalScheduled = allWeekTasks.length
      lastWeekStats = { totalDone, totalScheduled }
    }
  }

  // Compute this week's goal stats
  try {
    const thisWeekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekResponse = await getWeekHomeTasks(thisWeekStart, dateStr)
    if (weekResponse.success && weekResponse.data) {
      const allWeekTasks = Object.values(weekResponse.data).flat()
      const goalMap = new Map<string, { goalName: string; done: number; total: number }>()

      for (const task of allWeekTasks) {
        const goal = task.goal
        if (!goal) continue
        const goalId = goal.id
        const existing = goalMap.get(goalId) ?? { goalName: goal.name, done: 0, total: 0 }
        existing.total++
        if (task.todayCheckIn?.status === 'done') existing.done++
        goalMap.set(goalId, existing)
      }

      goalStats = Array.from(goalMap.entries())
        .filter(([, stats]) => stats.total > 0)
        .map(([goalId, stats]) => ({
          goalId,
          goalName: stats.goalName,
          done: stats.done,
          total: stats.total,
        }))
    }
  } catch {
    // Silently fail — goal progress is optional
  }

  const computed = computeNotifications(todayTasks, activeGoals, today, {
    lastWeekStats,
    goalStats,
  })

  // Merge announcements as high-priority notifications
  const announcements = announcementsResponse.success ? unwrapResponse(announcementsResponse) : []
  const announcementNotifications = mapAnnouncementsToNotifications(announcements)

  return [...announcementNotifications, ...computed]
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.today(),
    queryFn: fetchNotifications,
    staleTime: STALE_TIMES.NOTIFICATIONS,
    refetchOnWindowFocus: true,
  })
}

export function useNotificationCount() {
  const { data: notifications = [] } = useNotifications()
  return countActionableNotifications(notifications)
}
