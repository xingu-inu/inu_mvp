'use client'

import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'

/* ── Shared types ── */

export interface DragHandleProps {
  setActivatorRef: (element: HTMLElement | null) => void
  listeners: ReturnType<typeof useSortable>['listeners']
  attributes: ReturnType<typeof useSortable>['attributes']
}

/* ── Sortable group wrapper (Roadmap groups) ── */

export function SortableGroupItem({
  id,
  children,
}: {
  id: string
  children: (dragHandleProps: DragHandleProps) => React.ReactNode
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    listeners,
    attributes,
  } = useSortable({ id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ setActivatorRef: setActivatorNodeRef, listeners, attributes })}
    </div>
  )
}

/* ── Sortable area wrapper (Home areas) ── */

export function SortableAreaItem({
  id,
  data,
  children,
}: {
  id: string
  data?: Record<string, unknown>
  children: (dragHandleProps: DragHandleProps) => React.ReactNode
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    listeners,
    attributes,
  } = useSortable({ id, data })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ setActivatorRef: setActivatorNodeRef, listeners, attributes })}
    </div>
  )
}

/* ── Sortable task wrapper (shared by Home + Roadmap) ── */

export function SortableTaskItem({
  id,
  data,
  children,
}: {
  id: string
  data?: Record<string, unknown>
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    touchAction: 'none' as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}
