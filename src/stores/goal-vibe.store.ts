import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface GoalVibe {
  emoji?: string
  themeColor?: string // one of VIBE_COLORS keys
}

export const VIBE_COLORS = {
  rose: '#f43f5e',
  amber: '#f59e0b',
  lime: '#84cc16',
  emerald: '#10b981',
  sky: '#0ea5e9',
  violet: '#8b5cf6',
  fuchsia: '#d946ef',
  slate: '#64748b',
} as const

export type VibeColorKey = keyof typeof VIBE_COLORS

export const VIBE_EMOJIS = ['🎯', '🚀', '💪', '📚', '💡', '🌱', '❤️', '⭐', '🏃', '🎨', '💰', '🧘']

interface GoalVibeState {
  goalVibes: Record<string, GoalVibe>
  setGoalVibe: (goalId: string, vibe: Partial<GoalVibe>) => void
  clearGoalVibe: (goalId: string) => void
  getGoalVibe: (goalId: string) => GoalVibe | undefined
}

export const useGoalVibeStore = create<GoalVibeState>()(
  persist(
    (set, get) => ({
      goalVibes: {},

      setGoalVibe: (goalId, vibe) => {
        const existing = get().goalVibes[goalId] ?? {}
        set({
          goalVibes: {
            ...get().goalVibes,
            [goalId]: { ...existing, ...vibe },
          },
        })
      },

      clearGoalVibe: (goalId) => {
        const { goalVibes } = get()
        const next = { ...goalVibes }
        delete next[goalId]
        set({ goalVibes: next })
      },

      getGoalVibe: (goalId) => get().goalVibes[goalId],
    }),
    {
      name: 'inu-goal-vibes',
    }
  )
)
