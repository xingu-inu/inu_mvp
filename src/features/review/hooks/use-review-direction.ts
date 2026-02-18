'use client'

import { useDirection } from '@/queries/use-direction'
import { useReviewStore } from '@/stores/review.store'

/**
 * Resolves the active direction ID for the review page.
 * Returns the user-selected direction or falls back to the current active direction.
 */
export function useReviewDirection() {
  const { data: currentDirection } = useDirection()
  const selectedDirectionId = useReviewStore((s) => s.selectedDirectionId)

  const directionId = selectedDirectionId ?? currentDirection?.id ?? undefined
  const isCurrentVersion = !selectedDirectionId || selectedDirectionId === currentDirection?.id

  return { directionId, isCurrentVersion }
}
