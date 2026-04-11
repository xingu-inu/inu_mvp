'use client'

import { memo, useRef, useEffect, type KeyboardEvent, type FocusEvent, type RefObject } from 'react'
import type { SelectedNodeType } from '@/stores/roadmap.store'

interface InlineEditInputProps {
  nodeType: SelectedNodeType
  nodeId: string
  defaultValue: string
  className?: string
  onCommit: (nodeType: SelectedNodeType, nodeId: string, newName: string) => void
  onCancel: () => void
  /** Called after commit on Tab — create child */
  onChainTab?: () => void
  /** Shared ref to preserve typed text across node ID swaps (temp → real) */
  pendingValueRef?: RefObject<string | null>
  /** Container ref for multi-field edit — skip blur commit when focus stays in container */
  editContainerRef?: RefObject<HTMLElement | null>
}

export const InlineEditInput = memo(function InlineEditInput({
  nodeType,
  nodeId,
  defaultValue,
  className = '',
  onCommit,
  onCancel,
  onChainTab,
  pendingValueRef,
  editContainerRef,
}: InlineEditInputProps) {
  const committedRef = useRef(false)
  const settledRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Delay focus to outlast Radix ContextMenu's focus restoration, then mark settled
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
      settledRef.current = true
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  // Restore pending value (from a previous input instance after temp→real ID swap)
  useEffect(() => {
    if (pendingValueRef?.current != null && inputRef.current) {
      inputRef.current.value = pendingValueRef.current
      pendingValueRef.current = null
    }
  }, [pendingValueRef])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      committedRef.current = true
      onCommit(nodeType, nodeId, e.currentTarget.value)
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      committedRef.current = true
      onCancel()
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      committedRef.current = true
      onCommit(nodeType, nodeId, e.currentTarget.value)
      onChainTab?.()
    }
  }

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (committedRef.current) {
      committedRef.current = false
      return
    }
    // Skip spurious blur before focus is settled (e.g. Radix ContextMenu focus restore)
    if (!settledRef.current) {
      return
    }
    // Skip commit when focus moves within the edit container (multi-field edit)
    if (
      editContainerRef?.current &&
      e.relatedTarget instanceof Node &&
      editContainerRef.current.contains(e.relatedTarget)
    ) {
      return
    }
    // If value unchanged, cancel instead of committing a no-op
    if (e.target.value === defaultValue) {
      onCancel()
      return
    }
    onCommit(nodeType, nodeId, e.target.value)
  }

  return (
    <input
      ref={inputRef}
      defaultValue={defaultValue}
      className={`w-full bg-transparent outline-none ${className}`}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onInput={(e) => {
        if (pendingValueRef) {
          pendingValueRef.current = (e.target as HTMLInputElement).value
        }
      }}
      onClick={(e) => e.stopPropagation()}
    />
  )
})
