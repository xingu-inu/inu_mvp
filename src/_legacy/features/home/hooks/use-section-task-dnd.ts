'use client'

import { useState, useCallback, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, startOfWeek } from 'date-fns'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { safeNewOrderBetween } from '@/lib/fractional-index'
import { upsertTaskDateSortOrder } from '@/actions/home.actions'
import { queryKeys } from '@/lib/query/keys'
import {
  snapshotHomeCaches,
  restoreHomeCaches,
  patchTaskSortOrderForDate,
} from '@/lib/utils/home-cache-utils'
import type { HomeTask } from '@/types/entities'

interface DateSortOrderVars {
  taskId: string
  date: string
  sortOrder: string
}

/**
 * Per-section task DnD hook — simple within-section reorder only.
 * Uses date-specific sort order so reordering on one date does NOT affect other dates.
 *
 * Each AreaTaskSection and DailySection uses this hook independently
 * inside their own DndContext — no cross-section moves.
 */
export function useSectionTaskDnd(tasks: HomeTask[], selectedDate: Date) {
  const queryClient = useQueryClient()
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const weekStartStr = format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')

  // ── Local override during drag — null means "use server tasks" ──
  const [localOverride, setLocalOverride] = useState<HomeTask[] | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  // ── Server mutation: date-specific sort order upsert ──
  const mutation = useMutation({
    mutationFn: (vars: DateSortOrderVars) =>
      upsertTaskDateSortOrder(vars.taskId, vars.date, vars.sortOrder),
    onMutate: async (vars) => {
      // Cancel only the specific daily + weekly queries, not the entire app
      const dailyPrefix = [...queryKeys.tasks.all, 'home', dateStr]
      const weeklyPrefix = [...queryKeys.tasks.all, 'home', 'week', weekStartStr]
      await queryClient.cancelQueries({ queryKey: dailyPrefix })
      await queryClient.cancelQueries({ queryKey: weeklyPrefix })

      const snapshot = snapshotHomeCaches(queryClient, dateStr, weekStartStr)

      // Optimistic: patch sortOrder ONLY for this date
      patchTaskSortOrderForDate(queryClient, dateStr, weekStartStr, vars.taskId, vars.sortOrder)

      return snapshot
    },
    onError: (_err, _vars, context) => {
      if (context) {
        restoreHomeCaches(queryClient, context)
      }
      toast.error('순서 변경에 실패했어요. 다시 시도해주세요.')
    },
    onSettled: async () => {
      // Invalidate only the specific daily + weekly caches — not the entire task tree.
      // This prevents unnecessary refetches of Roadmap, Review, etc.
      const dailyPrefix = [...queryKeys.tasks.all, 'home', dateStr]
      const weeklyPrefix = [...queryKeys.tasks.all, 'home', 'week', weekStartStr]
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dailyPrefix }),
        queryClient.invalidateQueries({ queryKey: weeklyPrefix }),
      ])
      setLocalOverride(null)
    },
  })

  // Effective tasks: local override trumps server until onSettled clears it
  const localTasks = localOverride ?? tasks

  // ── Lookup map ──
  const tasksById = useMemo(() => new Map(localTasks.map((t) => [t.id, t])), [localTasks])
  const activeTask = activeTaskId ? (tasksById.get(activeTaskId) ?? null) : null

  // ── Handlers ──

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveTaskId(null)

      if (!over || active.id === over.id) return

      const oldIndex = localTasks.findIndex((t) => t.id === active.id)
      const newIndex = localTasks.findIndex((t) => t.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(localTasks, oldIndex, newIndex)
      setLocalOverride(reordered)

      // Compute fractional sort_order from neighbors
      const taskId = String(active.id)
      const newPos = reordered.findIndex((t) => t.id === taskId)
      const prevTask = newPos > 0 ? reordered[newPos - 1] : null
      const nextTask = newPos < reordered.length - 1 ? reordered[newPos + 1] : null
      const newOrder = safeNewOrderBetween(
        prevTask?.sort_order ?? null,
        nextTask?.sort_order ?? null
      )

      mutation.mutate({
        taskId,
        date: dateStr,
        sortOrder: newOrder,
      })
    },
    [localTasks, mutation, dateStr]
  )

  const handleDragCancel = useCallback(() => {
    setActiveTaskId(null)
    setLocalOverride(null)
  }, [])

  return {
    localTasks,
    activeTaskId,
    activeTask,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  }
}
