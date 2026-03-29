import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface StickyNote {
  id: string
  text: string
  color: string
  x: number
  y: number
  createdAt: string
}

export const STICKY_COLORS = [
  '#fef08a', // pastel yellow (default)
  '#fecdd3', // pastel pink
  '#bfdbfe', // pastel blue
  '#bbf7d0', // pastel green
  '#e9d5ff', // pastel purple
  '#fed7aa', // pastel orange
] as const

export type StickyColor = (typeof STICKY_COLORS)[number]

const MAX_STICKY_NOTES = 50

interface StickyNotesState {
  notes: StickyNote[]
  addNote: (x: number, y: number) => string
  updateNote: (id: string, updates: Partial<Omit<StickyNote, 'id' | 'createdAt'>>) => void
  removeNote: (id: string) => void
  convertToGoal: (id: string) => string
}

export const useStickyNotesStore = create<StickyNotesState>()(
  persist(
    (set, get) => ({
      notes: [],

      addNote: (x, y) => {
        const id = crypto.randomUUID()
        const note: StickyNote = {
          id,
          text: '',
          color: STICKY_COLORS[0],
          x,
          y,
          createdAt: new Date().toISOString(),
        }
        const existing = get().notes
        // Enforce max note limit — remove oldest if at capacity
        const trimmed = existing.length >= MAX_STICKY_NOTES ? existing.slice(1) : existing
        set({ notes: [...trimmed, note] })
        return id
      },

      updateNote: (id, updates) => {
        set({
          notes: get().notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        })
      },

      removeNote: (id) => {
        set({ notes: get().notes.filter((n) => n.id !== id) })
      },

      convertToGoal: (id) => {
        const note = get().notes.find((n) => n.id === id)
        const text = note?.text ?? ''
        set({ notes: get().notes.filter((n) => n.id !== id) })
        return text
      },
    }),
    {
      name: 'inu-sticky-notes',
    }
  )
)
