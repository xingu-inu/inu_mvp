import { create } from 'zustand'
import type { AreaReviewData } from '@/features/review/hooks/use-review-roadmap-data'

export type ReviewPanelMode = 'empty' | 'day-detail' | 'area-detail' | 'goal-detail'

interface ReviewState {
  panelMode: ReviewPanelMode
  selectedDate: string | null
  selectedAreaId: string | null
  selectedGoalId: string | null
  selectedDirectionId: string | null
  roadmapData: AreaReviewData[]

  selectDay: (date: string) => void
  selectArea: (areaId: string) => void
  selectGoal: (goalId: string) => void
  setSelectedDirectionId: (id: string | null) => void
  setRoadmapData: (data: AreaReviewData[]) => void
  goBackToEmpty: () => void
  goBackToArea: () => void
  clearSelection: () => void
  reset: () => void
}

const initialState = {
  panelMode: 'empty' as ReviewPanelMode,
  selectedDate: null as string | null,
  selectedAreaId: null as string | null,
  selectedGoalId: null as string | null,
  selectedDirectionId: null as string | null,
  roadmapData: [] as AreaReviewData[],
}

export const useReviewStore = create<ReviewState>()((set) => ({
  ...initialState,

  selectDay: (date) =>
    set({
      panelMode: 'day-detail',
      selectedDate: date,
      selectedAreaId: null,
      selectedGoalId: null,
    }),

  selectArea: (areaId) =>
    set({
      panelMode: 'area-detail',
      selectedAreaId: areaId,
      selectedDate: null,
      selectedGoalId: null,
    }),

  selectGoal: (goalId) =>
    set({ panelMode: 'goal-detail', selectedGoalId: goalId, selectedDate: null }),

  goBackToEmpty: () =>
    set({
      panelMode: 'empty',
      selectedDate: null,
      selectedAreaId: null,
      selectedGoalId: null,
    }),

  goBackToArea: () =>
    set((state) => ({
      panelMode: 'area-detail',
      selectedGoalId: null,
      selectedAreaId: state.selectedAreaId,
    })),

  setSelectedDirectionId: (id) => set({ selectedDirectionId: id }),

  clearSelection: () =>
    set({
      panelMode: 'empty',
      selectedDate: null,
      selectedAreaId: null,
      selectedGoalId: null,
    }),

  reset: () => set(initialState),
  setRoadmapData: (data) => set({ roadmapData: data }),
}))
