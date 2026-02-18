import { create } from 'zustand'
import type { AreaChangesSummary } from '@/features/review/utils/timeline-utils'
import type { AreaReviewData } from '@/features/review/hooks/use-review-roadmap-data'

export type ReviewPanelMode = 'overview' | 'day-detail' | 'area-detail' | 'goal-detail'

interface ReviewState {
  panelMode: ReviewPanelMode
  selectedDate: string | null
  selectedAreaId: string | null
  selectedGoalId: string | null
  selectedDirectionId: string | null
  areaChanges: AreaChangesSummary[]
  roadmapData: AreaReviewData[]

  selectDay: (date: string) => void
  selectArea: (areaId: string) => void
  selectGoal: (goalId: string) => void
  setSelectedDirectionId: (id: string | null) => void
  setAreaChanges: (data: AreaChangesSummary[]) => void
  setRoadmapData: (data: AreaReviewData[]) => void
  goBackToOverview: () => void
  goBackToArea: () => void
  clearSelection: () => void
  reset: () => void
}

const initialState = {
  panelMode: 'overview' as ReviewPanelMode,
  selectedDate: null as string | null,
  selectedAreaId: null as string | null,
  selectedGoalId: null as string | null,
  selectedDirectionId: null as string | null,
  areaChanges: [] as AreaChangesSummary[],
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

  selectGoal: (goalId) => set({ panelMode: 'goal-detail', selectedGoalId: goalId }),

  goBackToOverview: () =>
    set({
      panelMode: 'overview',
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

  setAreaChanges: (data) => set({ areaChanges: data }),

  clearSelection: () =>
    set({
      panelMode: 'overview',
      selectedDate: null,
      selectedAreaId: null,
      selectedGoalId: null,
    }),

  reset: () => set(initialState),
  setRoadmapData: (data) => set({ roadmapData: data }),
}))
