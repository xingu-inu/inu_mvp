'use client'

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { STALE_TIMES } from '@/lib/query/stale-times'
import { computeNotifications, countActionableNotifications } from '@/lib/notifications'
import { unwrapResponse } from '@/lib/api'
import { getGoalsForNotifications, getRecentlyCompletedGoals } from '@/actions/goal.actions'
import { getRecentlyCompletedGroups } from '@/actions/group.actions'
import { getActiveAnnouncements } from '@/actions/announcement.actions'
import type { AppNotification } from '@/types/entities'
import type { Announcement } from '@/repositories/announcement.repository'

// ─── LocalStorage Keys ──────────────────────────────
const DISMISSED_KEY = 'inu-dismissed-notifications'
const READ_KEY = 'inu-read-notifications'
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

interface TimestampedEntry {
  id: string
  at: number
}

function parseEntries(raw: string | null): TimestampedEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as TimestampedEntry[] | string[]
    if (parsed.length === 0) return []
    if (typeof parsed[0] === 'string') {
      return (parsed as string[]).map((id) => ({ id, at: Date.now() }))
    }
    return parsed as TimestampedEntry[]
  } catch {
    return []
  }
}

function getValidIds(key: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const entries = parseEntries(localStorage.getItem(key))
    if (entries.length === 0) return []
    const now = Date.now()
    const valid = entries.filter((e) => now - e.at < THIRTY_DAYS)
    if (valid.length < entries.length) {
      localStorage.setItem(key, JSON.stringify(valid))
    }
    return valid.map((e) => e.id)
  } catch {
    return []
  }
}

function addIds(key: string, ids: string[]) {
  if (typeof window === 'undefined') return
  const entries = parseEntries(localStorage.getItem(key))
  const existing = new Set(entries.map((e) => e.id))
  const now = Date.now()
  for (const id of ids) {
    if (!existing.has(id)) {
      entries.push({ id, at: now })
    }
  }
  localStorage.setItem(key, JSON.stringify(entries))
}

function removeIds(key: string, ids: string[]) {
  if (typeof window === 'undefined') return
  const entries = parseEntries(localStorage.getItem(key))
  const idsToRemove = new Set(ids)
  localStorage.setItem(key, JSON.stringify(entries.filter((e) => !idsToRemove.has(e.id))))
}

// ─── Dismissed (X 버튼 → 완전 숨김) ─────────────────
export function dismissNotification(id: string) {
  addIds(DISMISSED_KEY, [id])
}

// ─── Read (클릭 → 읽음 표시, 여전히 보임) ───────────
export function markAsRead(id: string) {
  addIds(READ_KEY, [id])
}

export function markAllAsRead(ids: string[]) {
  addIds(READ_KEY, ids)
}

export function unmarkAsRead(ids: string[]) {
  removeIds(READ_KEY, ids)
}

export function getReadIds(): string[] {
  return getValidIds(READ_KEY)
}

// ─── Announcement mapping ────────────────────────────
const ANNOUNCEMENT_ICON: Record<string, string> = {
  info: 'Megaphone',
  update: 'ArrowUpCircle',
  event: 'PartyPopper',
}

function mapAnnouncementsToNotifications(announcements: Announcement[]): AppNotification[] {
  return announcements.map((a) => ({
    id: `announcement-${a.id}`,
    type: 'announcement' as const,
    title: a.title,
    message: a.content,
    icon: ANNOUNCEMENT_ICON[a.type] ?? 'Megaphone',
    priority: 5,
    autoResolve: false,
  }))
}

// ─── Fetch ───────────────────────────────────────────
async function fetchNotifications(queryClient: QueryClient): Promise<AppNotification[]> {
  const today = new Date()

  const [activeGoalsRes, completedGoalsRes, recentGroupsRes, announcements] = await Promise.all([
    getGoalsForNotifications(),
    getRecentlyCompletedGoals(),
    getRecentlyCompletedGroups(),
    queryClient
      .ensureQueryData<Announcement[]>({
        queryKey: queryKeys.announcements.active,
        queryFn: () => getActiveAnnouncements().then(unwrapResponse),
        staleTime: STALE_TIMES.ANNOUNCEMENTS,
      })
      .catch(() => [] as Announcement[]),
  ])

  const activeGoals = activeGoalsRes.success ? activeGoalsRes.data : []
  const completedGoals = completedGoalsRes.success ? completedGoalsRes.data : []
  const recentGroups = recentGroupsRes.success ? recentGroupsRes.data : []

  const computed = computeNotifications(activeGoals, completedGoals, recentGroups, today)
  const announcementNotifications = mapAnnouncementsToNotifications(announcements)
  const dismissedIds = getValidIds(DISMISSED_KEY)

  const all = [...announcementNotifications, ...computed]
  return all.filter((n) => !dismissedIds.includes(n.id))
}

// ─── Hooks ───────────────────────────────────────────
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
  const readSet = new Set(getReadIds())
  const unread = notifications.filter((n) => !readSet.has(n.id))
  return countActionableNotifications(unread)
}
