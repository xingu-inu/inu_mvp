'use client'

import { useState, useCallback } from 'react'

interface UseDeleteConfirmReturn {
  /** The ID currently targeted for deletion, or null */
  deletingId: string | null
  /** Toggle: if same id, clears; otherwise sets the new id */
  toggleDelete: (id: string) => void
  /** Clear the deletion state */
  clearDelete: () => void
  /** Check if a specific id is being deleted */
  isDeleting: (id: string) => boolean
}

export function useDeleteConfirm(): UseDeleteConfirmReturn {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const toggleDelete = useCallback((id: string) => {
    setDeletingId((prev) => (prev === id ? null : id))
  }, [])

  const clearDelete = useCallback(() => {
    setDeletingId(null)
  }, [])

  const isDeleting = useCallback((id: string) => deletingId === id, [deletingId])

  return { deletingId, toggleDelete, clearDelete, isDeleting }
}
