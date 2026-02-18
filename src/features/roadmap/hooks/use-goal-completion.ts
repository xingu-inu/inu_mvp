'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { CompletionChoice } from '../components/shared/goal-completion-constants'

interface UseGoalCompletionOptions {
  onComplete: (choice: CompletionChoice, note?: string) => void
  /** If true, resets selected/note after confirm (for dialogs that stay mounted) */
  resetAfterConfirm?: boolean
}

interface UseGoalCompletionReturn {
  selected: CompletionChoice
  setSelected: (choice: CompletionChoice) => void
  note: string
  setNote: (note: string) => void
  handleConfirm: () => void
  /** Reset state to defaults (for cancel in dialogs) */
  reset: () => void
}

export function useGoalCompletion({
  onComplete,
  resetAfterConfirm = false,
}: UseGoalCompletionOptions): UseGoalCompletionReturn {
  const router = useRouter()
  const [selected, setSelected] = useState<CompletionChoice>('archive')
  const [note, setNote] = useState('')

  const reset = useCallback(() => {
    setSelected('archive')
    setNote('')
  }, [])

  const handleConfirm = useCallback(() => {
    onComplete(selected, note.trim() || undefined)
    if (selected === 'next-level') {
      router.push('/roadmap')
    }
    if (resetAfterConfirm) {
      reset()
    }
  }, [selected, note, onComplete, router, resetAfterConfirm, reset])

  return { selected, setSelected, note, setNote, handleConfirm, reset }
}
