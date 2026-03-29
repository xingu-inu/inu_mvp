import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { GoalStatus } from '@/types/entities'

import {
  createSelectionSlice,
  selectionInitialState,
  type SelectionSlice,
} from './roadmap-selection.store'
import { createVersionSlice, versionInitialState, type VersionSlice } from './roadmap-version.store'

// ── Re-exports (barrel) ────────────────────────────────

export type { Selection, PanelMode, InlineMode, SelectionSlice } from './roadmap-selection.store'

export {
  useRoadmapSelectionStore,
  selectSelection,
  selectGoalId,
  selectSelectedNodeId,
  selectPanelMode,
  selectInlineMode,
} from './roadmap-selection.store'

export type { VersionSlice } from './roadmap-version.store'

export { useRoadmapVersionStore } from './roadmap-version.store'

// ── Types (remaining in this store) ────────────────────

export type StatusFilter = GoalStatus | 'all'

export type SelectedNodeType = 'direction' | 'area' | 'goal' | 'group' | 'task'

export type TreeLayoutDirection = 'vertical' | 'horizontal'

export type RightPanelTab = 'roadmap' | 'ai-chat'

// ── UI Slice (remaining properties) ────────────────────

export interface UISlice {
  statusFilter: StatusFilter
  setStatusFilter: (filter: StatusFilter) => void
  expandedAreas: string[]
  toggleAreaExpanded: (areaId: string) => void
  setAllAreasExpanded: (areaIds: string[]) => void
  rightPanelTab: RightPanelTab
  setRightPanelTab: (tab: RightPanelTab) => void
  treeLayout: TreeLayoutDirection
  setTreeLayout: (layout: TreeLayoutDirection) => void
  isFloatingPanelOpen: boolean
  setFloatingPanelOpen: (open: boolean) => void
  toggleFloatingPanel: () => void
  mobileDrawerGoalId: string | null
  openMobileDrawer: (goalId: string) => void
  closeMobileDrawer: () => void
  reset: () => void
}

const uiInitialState = {
  statusFilter: 'all' as StatusFilter,
  expandedAreas: [] as string[],
  rightPanelTab: 'roadmap' as RightPanelTab,
  treeLayout: 'horizontal' as TreeLayoutDirection,
  isFloatingPanelOpen: false,
  mobileDrawerGoalId: null as string | null,
}

// ── Combined state ─────────────────────────────────────

export type RoadmapState = SelectionSlice & VersionSlice & UISlice

const initialState = {
  ...selectionInitialState,
  ...versionInitialState,
  ...uiInitialState,
}

// ── Combined store ─────────────────────────────────────

export const useRoadmapStore = create<RoadmapState>()(
  persist(
    (...args) => {
      const [set, get] = args

      return {
        // Compose slices
        ...createSelectionSlice(...args),
        ...createVersionSlice(...args),

        // UI slice (inline — no cross-cutting concerns)
        ...uiInitialState,

        setStatusFilter: (filter: StatusFilter) => set({ statusFilter: filter }),

        toggleAreaExpanded: (areaId: string) => {
          const { expandedAreas } = get()
          const isExpanded = expandedAreas.includes(areaId)
          set({
            expandedAreas: isExpanded
              ? expandedAreas.filter((id) => id !== areaId)
              : [...expandedAreas, areaId],
          })
        },

        setAllAreasExpanded: (areaIds: string[]) => set({ expandedAreas: areaIds }),

        setRightPanelTab: (tab: RightPanelTab) => set({ rightPanelTab: tab }),

        setTreeLayout: (layout: TreeLayoutDirection) => set({ treeLayout: layout }),

        setFloatingPanelOpen: (open: boolean) => set({ isFloatingPanelOpen: open }),
        toggleFloatingPanel: () => set((s) => ({ isFloatingPanelOpen: !s.isFloatingPanelOpen })),

        openMobileDrawer: (goalId: string) => set({ mobileDrawerGoalId: goalId }),
        closeMobileDrawer: () => set({ mobileDrawerGoalId: null }),

        reset: () => set(initialState),
      }
    },
    {
      name: 'inu-roadmap',
      partialize: (state) => ({
        statusFilter: state.statusFilter,
        expandedAreas: state.expandedAreas,
        treeLayout: state.treeLayout,
      }),
    }
  )
)

// ── Selectors (remaining UI concerns) ──────────────────

export const selectStatusFilter = (s: RoadmapState) => s.statusFilter
export const selectRightPanelTab = (s: RoadmapState) => s.rightPanelTab
export const selectMobileDrawerGoalId = (s: RoadmapState) => s.mobileDrawerGoalId
export const selectIsFloatingPanelOpen = (s: RoadmapState) => s.isFloatingPanelOpen
