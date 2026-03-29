'use client'

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { computeNotifications, countActionableNotifications } from '@/lib/notifications'
import { unwrapResponse } from '@/lib/api'
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

async function fetchNotifications(queryClient: QueryClient): Promise<AppNotification[]> {
  const today = new Date()

  const [goalsResponse, announcements] = await Promise.all([
    getActiveGoalsMinimal(),
    queryClient.ensureQueryData<Announcement[]>({
      queryKey: queryKeys.announcements.active,
      queryFn: () => getActiveAnnouncements().then(unwrapResponse),
      staleTime: STALE_TIMES.ANNOUNCEMENTS,
    }),
  ])

  const activeGoals: MinimalGoal[] = goalsResponse.success ? goalsResponse.data : []

  const computed = computeNotifications(activeGoals, today)
  const announcementNotifications = mapAnnouncementsToNotifications(announcements)

  return [...announcementNotifications, ...computed]
}

export function useNotifications() {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: queryKeys.notifications.today(),
    queryFn: () => fetchNotifications(queryClient),
    staleTime: STALE_TIMES.NOTIFICATIONS,
    refetchOnWindowFocus: true,
  })
}

export function useNotificationCount() {
  const { data: notifications = [] } = useNotifications()
  return countActionableNotifications(notifications)
}
