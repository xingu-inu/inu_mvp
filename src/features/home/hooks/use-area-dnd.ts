'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, startOfWeek } from 'date-fns'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import { safeNewOrderBetween } from '@/lib/fractional-index'
import { moveNode } from '@/actions/tree.actions'
import { queryKeys } from '@/lib/query/keys'
import { snapshotHomeCaches, patchAreaInHomeCaches } from '@/lib/utils/home-cache-utils'
import type { AreaGroup } from '@/lib/utils/task-utils'

/**
 * Hook for area reorder DnD.
 * Called from the shared DndContext when the dragged item has type: 'area'.
 * Custom collision detection (homeCollisionDetection) ensures area drags
 * only see area droppables, preventing interference with task DnD.
 */
export function useAreaDnd(areaGroups: AreaGroup[], selectedDate: Date) {
  const queryClient = useQueryClient()
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const weekStartStr = format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd')

  const baseAreaOrder = useMemo(() => areaGroups.map((g) => g.area.id), [areaGroups])
  const [dragAreaOrder, setDragAreaOrder] = useState<string[] | null>(null)
  const areaOrder = dragAreaOrder ?? baseAreaOrder

  // Auto-clear drag overlay when base order updates (cache propagated)
  useEffect(() => {
    if (dragAreaOrder) {
      setDragAreaOrder(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseAreaOrder])

  const mutation = useMutation({
    mutationFn: (vars: { nodeId: string; newOrder: string; areaId: string }) =>
      moveNode({ nodeId: vars.nodeId, nodeType: 'area', newOrder: vars.newOrder }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'home'] })
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })
      const snapshot = snapshotHomeCaches(queryClient, dateStr, weekStartStr)
      patchAreaInHomeCaches(queryClient, dateStr, weekStartStr, vars.areaId, vars.newOrder)
      return snapshot
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.tasks.home(dateStr), context.daily)
        queryClient.setQueryData(queryKeys.tasks.homeWeek(weekStartStr), context.weekly)
      }
      toast.error('순서 변경에 실패했어요.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'home'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all })
    },
  })

  const onAreaDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      // Safety: only process area-type over targets
      const overData = over.data.current as { type?: string } | undefined
      if (overData?.type !== 'area') return

      const activeId = String(active.id).replace('area-', '')
      const overId = String(over.id).replace('area-', '')

      const oldIndex = baseAreaOrder.indexOf(activeId)
      const newIndex = baseAreaOrder.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      const newOrderArr = arrayMove(baseAreaOrder, oldIndex, newIndex)
      setDragAreaOrder(newOrderArr)

      // Compute sort_order from ORIGINAL items (before arrayMove)
      const originalItems = baseAreaOrder.map((id) => {
        const group = areaGroups.find((g) => g.area.id === id)
        return { id, sort_order: group?.area.sort_order ?? '' }
      })
      const newSortOrder = calculateNewOrderForArea(originalItems, oldIndex, newIndex)

      mutation.mutate({ nodeId: activeId, newOrder: newSortOrder, areaId: activeId })
    },
    [baseAreaOrder, areaGroups, mutation]
  )

  const onAreaDragCancel = useCallback(() => {
    setDragAreaOrder(null)
  }, [])

  return { areaOrder, onAreaDragEnd, onAreaDragCancel }
}

/**
 * Calculate new sort_order for an area move.
 * Takes ORIGINAL items array (before arrayMove) and from/to indices.
 * `toIndex` is the insert position in the shortened array (after removing fromIndex),
 * matching arrayMove's splice behavior.
 */
function calculateNewOrderForArea(
  items: Array<{ id: string; sort_order: string }>,
  fromIndex: number,
  toIndex: number
): string {
  const remaining = items.filter((_, i) => i !== fromIndex)

  if (toIndex <= 0) {
    return safeNewOrderBetween(null, remaining[0]?.sort_order ?? null)
  }
  if (toIndex >= remaining.length) {
    return safeNewOrderBetween(remaining[remaining.length - 1]?.sort_order ?? null, null)
  }

  return safeNewOrderBetween(
    remaining[toIndex - 1]?.sort_order ?? null,
    remaining[toIndex]?.sort_order ?? null
  )
}
