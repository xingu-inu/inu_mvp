'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, Target } from 'lucide-react'
import { useStickyNotesStore, STICKY_COLORS } from '@/stores/sticky-notes.store'
import type { StickyNote as StickyNoteType } from '@/stores/sticky-notes.store'

interface StickyNoteProps {
  note: StickyNoteType
  zoom: number
  onConvertToGoal: (id: string, text: string) => void
}

export function StickyNote({ note, zoom, onConvertToGoal }: StickyNoteProps) {
  const updateNote = useStickyNotesStore((s) => s.updateNote)
  const removeNote = useStickyNotesStore((s) => s.removeNote)
  const convertToGoal = useStickyNotesStore((s) => s.convertToGoal)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; noteX: number; noteY: number } | null>(
    null
  )
  const [isHovered, setIsHovered] = useState(false)
  const [isNew] = useState(() => Date.now() - new Date(note.createdAt).getTime() < 500)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const dragPosRef = useRef<{ x: number; y: number } | null>(null)

  // Auto-focus on new notes
  useEffect(() => {
    if (isNew) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 150)
    }
  }, [isNew])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only drag from the card surface, not textarea or buttons
      const target = e.target as HTMLElement
      if (target.tagName === 'TEXTAREA' || target.closest('button')) return

      e.preventDefault()
      e.stopPropagation()

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        noteX: note.x,
        noteY: note.y,
      }

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return
        const dx = (ev.clientX - dragRef.current.startX) / zoom
        const dy = (ev.clientY - dragRef.current.startY) / zoom
        const pos = {
          x: dragRef.current.noteX + dx,
          y: dragRef.current.noteY + dy,
        }
        dragPosRef.current = pos
        setDragPos(pos)
      }

      const handleMouseUp = () => {
        if (dragPosRef.current) {
          updateNote(note.id, { x: dragPosRef.current.x, y: dragPosRef.current.y })
        }
        dragRef.current = null
        dragPosRef.current = null
        setDragPos(null)
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [note.id, note.x, note.y, zoom, updateNote]
  )

  const handleConvert = useCallback(() => {
    const text = convertToGoal(note.id)
    onConvertToGoal(note.id, text)
  }, [note.id, convertToGoal, onConvertToGoal])

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.05, 1], opacity: 1 }}
      transition={{ duration: 0.25, times: [0, 0.7, 1], ease: 'easeOut' }}
      style={{
        position: 'absolute',
        left: dragPos ? dragPos.x : note.x,
        top: dragPos ? dragPos.y : note.y,
        width: 160,
        height: 120,
        backgroundColor: note.color,
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'grab',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top bar: color dots + delete */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px 4px',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {STICKY_COLORS.map((color) => (
            <button
              key={color}
              onClick={(e) => {
                e.stopPropagation()
                updateNote(note.id, { color })
              }}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: color,
                border:
                  note.color === color
                    ? '2px solid rgba(0,0,0,0.35)'
                    : '1px solid rgba(0,0,0,0.15)',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
              aria-label={`색상 변경`}
            />
          ))}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            removeNote(note.id)
          }}
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            color: 'rgba(0,0,0,0.4)',
          }}
          aria-label="삭제"
        >
          <X size={12} />
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={note.text}
        onChange={(e) => updateNote(note.id, { text: e.target.value })}
        placeholder="아이디어를 적어보세요..."
        style={{
          flex: 1,
          resize: 'none',
          border: 'none',
          outline: 'none',
          backgroundColor: 'transparent',
          padding: '0 8px',
          fontSize: 12,
          lineHeight: 1.5,
          color: 'rgba(0,0,0,0.75)',
          cursor: 'text',
          fontFamily: 'inherit',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Convert to Goal button — appears on hover */}
      <div
        style={{
          padding: '4px 8px 6px',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleConvert()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            color: 'rgba(0,0,0,0.5)',
            background: 'rgba(0,0,0,0.06)',
            border: 'none',
            borderRadius: 6,
            padding: '2px 6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="목표로 전환"
        >
          <Target size={10} />
          목표로 전환
        </button>
      </div>
    </motion.div>
  )
}
