import { create } from 'zustand'

interface TreeDndState {
  activeId: string | null
  activeNodeType: string | null
  overId: string | null
  isDragging: boolean
}

interface TreeDndActions {
  setDragStart: (activeId: string, activeNodeType: string) => void
  setOverId: (overId: string | null) => void
  reset: () => void
}

export const useTreeDndStore = create<TreeDndState & TreeDndActions>((set) => ({
  activeId: null,
  activeNodeType: null,
  overId: null,
  isDragging: false,
  setDragStart: (activeId, activeNodeType) =>
    set({ activeId, activeNodeType, overId: null, isDragging: true }),
  setOverId: (overId) => set({ overId }),
  reset: () => set({ activeId: null, activeNodeType: null, overId: null, isDragging: false }),
}))

// Fine-grained selectors — each consumer only re-renders when its slice changes
export const selectIsDragging = (s: TreeDndState) => s.isDragging
export const selectOverId = (s: TreeDndState) => s.overId
export const selectActiveNodeType = (s: TreeDndState) => s.activeNodeType
export const selectIsDraggingTask = (s: TreeDndState) => s.activeNodeType === 'task'
