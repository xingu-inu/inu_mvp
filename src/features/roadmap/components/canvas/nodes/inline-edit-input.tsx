'use client'

import { memo, useRef, type KeyboardEvent, type FocusEvent } from 'react'
import type { SelectedNodeType } from '@/stores/roadmap.store'

interface InlineEditInputProps {
  nodeType: SelectedNodeType
  nodeId: string
  defaultValue: string
  className?: string
  onCommit: (nodeType: SelectedNodeType, nodeId: string, newName: string) => void
  onCancel: () => void
  /** Called after commit on Enter — create sibling */
  onChainEnter?: () => void
  /** Called after commit on Tab — create child */
  onChainTab?: () => void
}

export const InlineEditInput = memo(function InlineEditInput({
  nodeType,
  nodeId,
  defaultValue,
  className = '',
  onCommit,
  onCancel,
  onChainEnter,
  onChainTab,
}: InlineEditInputProps) {
  const committedRef = useRef(false)

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      committedRef.current = true
      onCommit(nodeType, nodeId, e.currentTarget.value)
      onChainEnter?.()
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
    onCommit(nodeType, nodeId, e.target.value)
  }

  return (
    <input
      autoFocus
      defaultValue={defaultValue}
      className={`w-full bg-transparent outline-none ${className}`}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onClick={(e) => e.stopPropagation()}
    />
  )
})
