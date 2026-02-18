import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AiPriorityRankResponse } from '@/lib/ai/types'

export type HomePanelMode = 'browse' | 'task-detail' | 'goal-view'

interface HomeState {
  // Detail panel state (desktop right panel)
  panelMode: HomePanelMode
  setPanelMode: (mode: HomePanelMode) => void
  selectedTaskId: string | null
  selectedGoalId: string | null
  selectTask: (taskId: string) => void
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

  // Reset
  reset: () => void
}

const initialState = {
  panelMode: 'browse' as HomePanelMode,
  selectedTaskId: null as string | null,
  selectedGoalId: null as string | null,
  highlightedTaskId: null as string | null,
  isPriorityRankOpen: false,
  priorityRankResult: null as AiPriorityRankResponse | null,
  priorityRankDate: null as string | null,
}

export const useHomeStore = create<HomeState>()(
  persist(
    (set) => ({
      ...initialState,

      setPanelMode: (mode) => set({ panelMode: mode }),

      selectTask: (taskId) => {
        set({
          panelMode: 'task-detail',
          selectedTaskId: taskId,
        })
      },

      selectGoal: (goalId) => {
        set({
          panelMode: 'goal-view',
          selectedGoalId: goalId,
        })
      },

      clearPanelSelection: () => {
        set({
          panelMode: 'browse',
          selectedTaskId: null,
          selectedGoalId: null,
        })
      },

      setHighlightedTaskId: (id) => set({ highlightedTaskId: id }),

      setIsPriorityRankOpen: (open) => set({ isPriorityRankOpen: open }),

      setPriorityRankResult: (result, date) =>
        set({ priorityRankResult: result, priorityRankDate: date }),

      clearPriorityRankResult: () => set({ priorityRankResult: null, priorityRankDate: null }),

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
