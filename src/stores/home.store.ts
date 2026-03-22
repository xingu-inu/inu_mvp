import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AiPriorityRankResponse } from '@/lib/ai/types'

export type HomePanelMode = 'browse' | 'goal-view'

interface HomeState {
  // Detail panel state (desktop right panel)
  panelMode: HomePanelMode
  setPanelMode: (mode: HomePanelMode) => void
  selectedGoalId: string | null
  selectGoal: (goalId: string) => void
  clearPanelSelection: () => void

  // Highlighted task (from week grid click → inline expand in TaskList)
  highlightedTaskId: string | null
  setHighlightedTaskId: (id: string | null) => void

  // AI Priority Rank
  isPriorityRankOpen: boolean
  setIsPriorityRankOpen: (open: boolean) => void
  priorityRankResult: AiPriorityRankResponse | null
  priorityRankDate: string | null
  setPriorityRankResult: (result: AiPriorityRankResponse, date: string) => void
  clearPriorityRankResult: () => void

  // Version filter
  selectedDirectionId: string | null
  setSelectedDirectionId: (id: string | null) => void

  // Reset
  reset: () => void
}

const initialState = {
  panelMode: 'browse' as HomePanelMode,
  selectedGoalId: null as string | null,
  highlightedTaskId: null as string | null,
  isPriorityRankOpen: false,
  priorityRankResult: null as AiPriorityRankResponse | null,
  priorityRankDate: null as string | null,
  selectedDirectionId: null as string | null,
}

export const useHomeStore = create<HomeState>()(
  persist(
    (set) => ({
      ...initialState,

      setPanelMode: (mode) => set({ panelMode: mode }),

      selectGoal: (goalId) => {
        set({
          panelMode: 'goal-view',
          selectedGoalId: goalId,
        })
      },

      clearPanelSelection: () => {
        set({
          panelMode: 'browse',
          selectedGoalId: null,
        })
      },

      setHighlightedTaskId: (id) => set({ highlightedTaskId: id }),

      setIsPriorityRankOpen: (open) => set({ isPriorityRankOpen: open }),

      setPriorityRankResult: (result, date) =>
        set({ priorityRankResult: result, priorityRankDate: date }),

      clearPriorityRankResult: () => set({ priorityRankResult: null, priorityRankDate: null }),

      setSelectedDirectionId: (id) => set({ selectedDirectionId: id }),

      reset: () => set(initialState),
    }),
    {
      name: 'inu-home',
      partialize: (state) => ({
        priorityRankResult: state.priorityRankResult,
        priorityRankDate: state.priorityRankDate,
      }),
    }
  )
)
