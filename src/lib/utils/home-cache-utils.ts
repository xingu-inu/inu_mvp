import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import type { HomeTaskDto as ActionHomeTask } from '@/actions/home.actions'

/** Snapshot both daily and weekly caches for rollback */
export function snapshotHomeCaches(
  qc: QueryClient,
  dateStr: string,
  weekStartStr: string
): { daily: unknown; weekly: unknown } {
  return {
    daily: qc.getQueryData(queryKeys.tasks.home(dateStr)),
    weekly: qc.getQueryData(queryKeys.tasks.homeWeek(weekStartStr)),
  }
}

/** Patch a single task in both daily and weekly caches (camelCase fields) */
export function patchTaskInHomeCaches(
  qc: QueryClient,
  dateStr: string,
  weekStartStr: string,
  taskId: string,
  patch: Partial<ActionHomeTask>
): void {
  // 1. Daily cache
  const dateKey = queryKeys.tasks.home(dateStr)
  qc.setQueryData<ActionHomeTask[]>(dateKey, (prev) =>
    prev?.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
  )

  // 2. Weekly cache
  const weekKey = queryKeys.tasks.homeWeek(weekStartStr)
  qc.setQueryData<Record<string, ActionHomeTask[]>>(weekKey, (prev) => {
    if (!prev) return prev
    const next = { ...prev }
    for (const [d, tasks] of Object.entries(next)) {
      if (tasks.some((t) => t.id === taskId)) {
        next[d] = tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t))
        break // task appears in only one date
      }
    }
    return next
  })
}

/** Patch area sort order across both daily and weekly caches */
export function patchAreaInHomeCaches(
  qc: QueryClient,
  dateStr: string,
  weekStartStr: string,
  areaId: string,
  newSortOrder: string
): void {
  const patchFn = (t: ActionHomeTask): ActionHomeTask =>
    t.goal?.area?.id === areaId
      ? { ...t, goal: { ...t.goal!, area: { ...t.goal!.area, sortOrder: newSortOrder } } }
      : t

  // Daily cache
  qc.setQueryData<ActionHomeTask[]>(queryKeys.tasks.home(dateStr), (prev) => prev?.map(patchFn))

  // Weekly cache — area sort order affects all days
  qc.setQueryData<Record<string, ActionHomeTask[]>>(
    queryKeys.tasks.homeWeek(weekStartStr),
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
