'use client'

import { memo, useState, useRef, useCallback, useEffect } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { X, Target } from 'lucide-react'
import { useStickyNotesStore, STICKY_COLORS } from '@/stores/sticky-notes.store'
import type { StickyNodeData } from '../types'

export const StickyNode = memo(function StickyNode({
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<Node<StickyNodeData, 'sticky'>>) {
  const updateNote = useStickyNotesStore((s) => s.updateNote)
  const removeNote = useStickyNotesStore((s) => s.removeNote)
  const convertToGoal = useStickyNotesStore((s) => s.convertToGoal)
  const onConvertToGoal = data.onConvertToGoal

  const [isEditing, setIsEditing] = useState(!data.text)
  const [isHovered, setIsHovered] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => {
        const ta = textareaRef.current
        if (ta) {
          ta.focus()
          ta.setSelectionRange(ta.value.length, ta.value.length)
        }
      })
    }
  }, [isEditing])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    const value = textareaRef.current?.value ?? ''
    if (value !== data.text) {
      updateNote(data.noteId, { text: value })
    }
  }, [data.noteId, data.text, updateNote])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Stop propagation so canvas shortcuts don't fire while editing
      e.stopPropagation()
      if (e.key === 'Escape') {
        setIsEditing(false)
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleBlur()
      }
    },
    [handleBlur]
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      removeNote(data.noteId)
    },
    [data.noteId, removeNote]
  )

  const handleConvertToGoal = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const text = convertToGoal(data.noteId)
      if (text.trim()) onConvertToGoal?.(text)
    },
    [data.noteId, convertToGoal, onConvertToGoal]
  )

  const handleColorChange = useCallback(
    (color: string) => {
      updateNote(data.noteId, { color })
    },
    [data.noteId, updateNote]
  )

  return (
    <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <Handle type="target" position={targetPosition ?? Position.Top} className="!invisible" />

      <div
        className="group relative max-w-[240px] min-w-[160px] rounded-lg shadow-sm transition-shadow hover:shadow-md"
        style={{ backgroundColor: data.color }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          setIsEditing(true)
        }}
      >
        {/* Delete button */}
        {isHovered && !isEditing && (
          <button
            onClick={handleDelete}
            className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-bg-primary)] shadow-sm ring-1 ring-[var(--color-border)] transition-colors hover:bg-red-100"
          >
            <X className="h-3 w-3 text-[var(--color-text-tertiary)]" />
          </button>
        )}

        {/* Convert to goal button */}
        {isHovered && !isEditing && data.text.trim() && (
          <button
            onClick={handleConvertToGoal}
            title="목표로 전환"
            className="absolute top-5 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-bg-primary)] shadow-sm ring-1 ring-[var(--color-border)] transition-colors hover:bg-blue-100"
          >
            <Target className="h-3 w-3 text-[var(--color-text-tertiary)]" />
          </button>
        )}

        {/* Content */}
        <div className="p-3">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              defaultValue={data.text}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="메모를 입력하세요..."
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-black/30"
              rows={3}
            />
          ) : (
            <p className="min-h-[1.25rem] cursor-text text-sm whitespace-pre-wrap">
              {data.text || <span className="text-black/30">더블클릭하여 편집</span>}
            </p>
          )}
        </div>

        {/* Color picker row */}
        {isHovered && !isEditing && (
          <div className="flex items-center gap-1 border-t border-black/5 px-3 py-1.5">
            {STICKY_COLORS.map((c) => (
              <button
                key={c}
                onClick={(e) => {
                  e.stopPropagation()
                  handleColorChange(c)
                }}
                className={`h-4 w-4 rounded-full ring-1 ring-black/10 transition-transform hover:scale-125 ${
                  c === data.color ? 'ring-2 ring-black/30' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={sourcePosition ?? Position.Bottom} className="!invisible" />
    </div>
  )
})
