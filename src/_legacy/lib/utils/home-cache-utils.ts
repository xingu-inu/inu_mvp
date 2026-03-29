import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import type { HomeTaskDto as ActionHomeTask } from '@/actions/home.actions'

/** Snapshot entries for rollback — flat array of [queryKey, data] pairs */
export type HomeCacheSnapshot = Array<[QueryKey, unknown]>

/**
 * Snapshot all daily and weekly home caches for rollback.
 * Uses prefix matching to capture ALL direction variants
 * (e.g. both ['tasks','home','2026-02-25',undefined] and ['tasks','home','2026-02-25','dir-id']).
 */
export function snapshotHomeCaches(
  qc: QueryClient,
  dateStr: string,
  weekStartStr: string
): HomeCacheSnapshot {
  return [
    ...qc.getQueriesData({ queryKey: [...queryKeys.tasks.all, 'home', dateStr] }),
    ...qc.getQueriesData({ queryKey: [...queryKeys.tasks.all, 'home', 'week', weekStartStr] }),
  ]
}

/** Restore home caches from snapshot */
export function restoreHomeCaches(qc: QueryClient, snapshot: HomeCacheSnapshot): void {
  for (const [key, data] of snapshot) {
    qc.setQueryData(key, data)
  }
}

/**
 * Patch a single task in all daily and weekly home caches (camelCase fields).
 * Uses prefix matching to hit ALL direction variants at once.
 */
export function patchTaskInHomeCaches(
  qc: QueryClient,
  dateStr: string,
  weekStartStr: string,
  taskId: string,
  patch: Partial<ActionHomeTask>
): void {
  // 1. Daily caches — all direction variants
  qc.setQueriesData<ActionHomeTask[]>(
    { queryKey: [...queryKeys.tasks.all, 'home', dateStr] },
    (prev) => prev?.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
  )

  // 2. Weekly caches — all direction variants
  qc.setQueriesData<Record<string, ActionHomeTask[]>>(
    { queryKey: [...queryKeys.tasks.all, 'home', 'week', weekStartStr] },
    (prev) => {
      if (!prev) return prev
      const next = { ...prev }
      for (const [d, tasks] of Object.entries(next)) {
        if (tasks.some((t) => t.id === taskId)) {
          next[d] = tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
          break // task appears in only one date
        }
      }
      return next
    }
  )
}

/**
 * Patch a single task's sortOrder ONLY for a specific date in home caches.
 * Used for date-specific sort order updates (per-date DnD reorder).
 * Unlike patchTaskInHomeCaches, this does NOT touch other dates in the weekly cache.
 */
export function patchTaskSortOrderForDate(
  qc: QueryClient,
  dateStr: string,
  weekStartStr: string,
  taskId: string,
  newSortOrder: string
): void {
  // 1. Daily caches — all direction variants for this specific date
  qc.setQueriesData<ActionHomeTask[]>(
    { queryKey: [...queryKeys.tasks.all, 'home', dateStr] },
    (prev) => prev?.map((t) => (t.id === taskId ? { ...t, sortOrder: newSortOrder } : t))
  )

  // 2. Weekly caches — ONLY patch the specific date entry, not other dates
  qc.setQueriesData<Record<string, ActionHomeTask[]>>(
    { queryKey: [...queryKeys.tasks.all, 'home', 'week', weekStartStr] },
    (prev) => {
      if (!prev || !prev[dateStr]) return prev
      return {
        ...prev,
        [dateStr]: prev[dateStr].map((t) =>
          t.id === taskId ? { ...t, sortOrder: newSortOrder } : t
        ),
      }
    }
  )
}

/**
 * Patch area sort order across all daily and weekly home caches.
 * Uses prefix matching to hit ALL direction variants at once.
 */
export function patchAreaInHomeCaches(
  qc: QueryClient,
  dateStr: string,
  weekStartStr: string,
  areaId: string,
  newSortOrder: string
): void {
  const patchFn = (t: ActionHomeTask): ActionHomeTask => {
    if (t.goal?.area?.id === areaId) {
      return { ...t, goal: { ...t.goal!, area: { ...t.goal!.area, sortOrder: newSortOrder } } }
    }
    if (t.directArea?.id === areaId) {
      return { ...t, directArea: { ...t.directArea, sortOrder: newSortOrder } }
    }
    return t
  }

  // Daily caches — all direction variants
  qc.setQueriesData<ActionHomeTask[]>(
    { queryKey: [...queryKeys.tasks.all, 'home', dateStr] },
    (prev) => prev?.map(patchFn)
  )

  // Weekly caches — all direction variants
  qc.setQueriesData<Record<string, ActionHomeTask[]>>(
    { queryKey: [...queryKeys.tasks.all, 'home', 'week', weekStartStr] },
    (prev) => {
      if (!prev) return prev
      const next: Record<string, ActionHomeTask[]> = {}
      for (const [d, tasks] of Object.entries(prev)) {
        next[d] = tasks.map(patchFn)
      }
      return next
    }
  )
}
