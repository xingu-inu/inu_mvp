import { create } from 'zustand'

interface NavigationState {
  // Scroll positions for each route
  scrollPositions: Record<string, number>
  setScrollPosition: (route: string, position: number) => void
  getScrollPosition: (route: string) => number

  // Active sheet/modal
  activeSheet: string | null
  openSheet: (id: string) => void
  closeSheet: () => void
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  scrollPositions: {},
  setScrollPosition: (route, position) =>
    set((state) => ({
      scrollPositions: { ...state.scrollPositions, [route]: position },
    })),
  getScrollPosition: (route) => get().scrollPositions[route] ?? 0,

  activeSheet: null,
  openSheet: (id) => set({ activeSheet: id }),
  closeSheet: () => set({ activeSheet: null }),
}))
