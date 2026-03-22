'use client'

import { memo, useCallback, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { X, ArrowRightLeft } from 'lucide-react'
import { useStickyNotesStore, STICKY_COLORS, type StickyColor } from '@/stores/sticky-notes.store'

export type StickyNodeData = {
  noteId: string
  text: string
  color: string
  onConvertToGoal?: (text: string) => void
}

export type StickyNodeType = Node<StickyNodeData, 'sticky'>

export const CanvasStickyNode = memo(function CanvasStickyNode({
  data,
}: NodeProps<StickyNodeType>) {
  const { noteId, text, color, onConvertToGoal } = data
  const updateNote = useStickyNotesStore((s) => s.updateNote)
  const removeNote = useStickyNotesStore((s) => s.removeNote)
  const convertToGoal = useStickyNotesStore((s) => s.convertToGoal)
  const textRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus on creation (empty text)
  useEffect(() => {
    if (!text && textRef.current) {
      textRef.current.focus()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNote(noteId, { text: e.target.value })
    },
    [noteId, updateNote]
  )

  const handleColorChange = useCallback(
    (newColor: StickyColor) => {
      updateNote(noteId, { color: newColor })
    },
    [noteId, updateNote]
  )

  return (
    <div
      className="group relative flex h-[120px] w-[160px] flex-col rounded-lg shadow-md transition-shadow hover:shadow-lg"
      style={{ backgroundColor: color }}
    >
      {/* Header with actions */}
      <div className="flex items-center justify-between px-2 pt-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        {/* Color picker dots */}
        <div className="flex gap-0.5">
          {STICKY_COLORS.map((c) => (
            <button
              key={c}
              className="h-3 w-3 rounded-full border border-black/10 transition-transform hover:scale-125"
              style={{ backgroundColor: c }}
              onClick={() => handleColorChange(c)}
            />
          ))}
        </div>
        {/* Delete button */}
        <button
          onClick={() => removeNote(noteId)}
          className="flex h-5 w-5 items-center justify-center rounded-full text-black/40 hover:bg-black/10 hover:text-black/70"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Text area */}
      <textarea
        ref={textRef}
        value={text}
        onChange={handleTextChange}
        placeholder="메모..."
        className="nowheel nodrag flex-1 resize-none bg-transparent px-2.5 pb-2 text-sm text-black/80 placeholder:text-black/30 focus:outline-none"
      />

      {/* Convert to goal button */}
      {text.trim() && (
        <button
          onClick={() => {
            const noteText = convertToGoal(noteId)
            onConvertToGoal?.(noteText)
          }}
          className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)] opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-[var(--color-bg-tertiary)]"
        >
          <ArrowRightLeft className="h-2.5 w-2.5" />
          목표로 전환
        </button>
      )}

      {/* Source handle for potential connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-0 !w-0 !border-none !bg-transparent"
      />
    </div>
  )
})
