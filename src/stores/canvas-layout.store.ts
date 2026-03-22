import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface NodePosition {
  x: number
  y: number
}

interface CanvasLayoutState {
  nodePositions: Record<string, NodePosition>
  setNodePosition: (id: string, x: number, y: number) => void
  setBulkPositions: (positions: Record<string, NodePosition>) => void
  resetLayout: () => void
}

export const useCanvasLayoutStore = create<CanvasLayoutState>()(
  persist(
    (set, get) => ({
      nodePositions: {},

      setNodePosition: (id, x, y) => {
        set({ nodePositions: { ...get().nodePositions, [id]: { x, y } } })
      },

      setBulkPositions: (positions) => {
        set({ nodePositions: { ...get().nodePositions, ...positions } })
      },

      resetLayout: () => {
        set({ nodePositions: {} })
      },
    }),
    { name: 'inu-canvas-layout' }
  )
)
