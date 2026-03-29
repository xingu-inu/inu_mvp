'use client'

import { useDirection, useDirectionHistory } from '@/queries/use-direction'
import { useHomeStore } from '@/stores/home.store'

/**
 * Resolves the active direction ID for the home page.
 * Returns the user-selected direction or falls back to the current active direction.
 * Also resolves selectedVersion for direction version filtering.
 */
export function useHomeDirection() {
  const { data: currentDirection } = useDirection()
  const { data: history } = useDirectionHistory()
  const selectedDirectionId = useHomeStore((s) => s.selectedDirectionId)

  const directionId = selectedDirectionId ?? currentDirection?.id ?? undefined
  const isCurrentVersion = !selectedDirectionId || selectedDirectionId === currentDirection?.id
  const selectedVersion = selectedDirectionId
    ? (history?.find((h) => h.id === selectedDirectionId)?.version ?? null)
    : null

  return { directionId, isCurrentVersion, selectedDirectionId, selectedVersion }
}
