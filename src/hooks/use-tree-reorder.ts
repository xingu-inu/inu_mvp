'use client'

import { useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDebouncedCallback } from 'use-debounce'
import { toast } from 'sonner'
import { getNewOrder } from '@/lib/fractional-index'
import { moveNode, type NodeType, type MoveNodeInput } from '@/actions/tree.actions'
import { queryKeys } from '@/lib/query/keys'

interface UseTreeReorderOptions {
  nodeType: NodeType
  queryKey: readonly unknown[]
  parentKey?: string // Parent column name for cross-parent moves (e.g., 'area_id' for goals)
}

interface ReorderableItem {
  id: string
  sort_order: string
}

export function useTreeReorder<T extends ReorderableItem>({
  nodeType,
  queryKey,
  parentKey,
}: UseTreeReorderOptions) {
  const queryClient = useQueryClient()
  const previousRef = useRef<T[] | null>(null)

  // Server mutation
  const mutation = useMutation({
    mutationFn: moveNode,
    onError: () => {
      // Rollback on error
      if (previousRef.current) {
        queryClient.setQueryData(queryKey, previousRef.current)
      }
      toast.error('이동에 실패했어요. 다시 시도해주세요.')
    },
    onSettled: (_data, _err, variables) => {
      // Sync with server
      queryClient.invalidateQueries({ queryKey })
      // Cross-parent 이동만 타임라인에 기록되므로 해당 경우에만 invalidate
      if (variables?.newParentId !== undefined) {
        queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all })
      }
    },
  })

  // Debounced mutation to minimize server requests during rapid drags
  const debouncedMutate = useDebouncedCallback((input: MoveNodeInput) => {
    mutation.mutate(input)
  }, 300)

  const handleReorder = useCallback(
    (itemId: string, fromIndex: number, toIndex: number, newParentId?: string) => {
      // No change if same position
      if (fromIndex === toIndex && !newParentId) return

      const items = queryClient.getQueryData<T[]>(queryKey)
      if (!items) return

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 1: Save previous state for rollback
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      previousRef.current = [...items]

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 2: Calculate new order
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const newOrder = getNewOrder(items, fromIndex, toIndex)

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 3: Optimistic Update
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const updated = [...items]
      const [movedItem] = updated.splice(fromIndex, 1)

      // Update order and optionally parent
      const updatedItem: T = {
        ...movedItem,
        sort_order: newOrder,
        ...(parentKey && newParentId ? { [parentKey]: newParentId } : {}),
      }

      updated.splice(toIndex, 0, updatedItem)

      // Update cache
      queryClient.setQueryData(queryKey, updated)

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 4: Debounced server request
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      debouncedMutate({
        nodeId: itemId,
        nodeType,
        newOrder,
        newParentId,
      })
    },
    [queryKey, nodeType, parentKey, queryClient, debouncedMutate]
  )

  return {
    handleReorder,
    isLoading: mutation.isPending,
  }
}
