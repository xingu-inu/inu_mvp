import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { GoalStatus } from '@/types/entities'

import {
  createSelectionSlice,
  selectionInitialState,
  type SelectionSlice,
} from './roadmap-selection.store'
import { createVersionSlice, versionInitialState, type VersionSlice } from './roadmap-version.store'

// ── Re-exports (barrel — preserves existing import paths) ──────────

export type { Selection, PanelMode, InlineMode, SelectionSlice } from './roadmap-selection.store'

export type { VersionSlice } from './roadmap-version.store'

export { useRoadmapSelectionStore } from './roadmap-selection.store'
export { useRoadmapVersionStore } from './roadmap-version.store'

// ── Core types (remain here) ───────────────────────────────────────

export type StatusFilter = GoalStatus | 'all'

export type SelectedNodeType = 'direction' | 'area' | 'goal' | 'group' | 'task'

export type RightPanelTab = 'roadmap' | 'inu'

// ── Core slice (statusFilter, expandedAreas, rightPanelTab, mobile drawer) ──

interface CoreSlice {
  statusFilter: StatusFilter
  setStatusFilter: (filter: StatusFilter) => void
  expandedAreas: string[]
  toggleAreaExpanded: (areaId: string) => void
  setAllAreasExpanded: (areaIds: string[]) => void
  rightPanelTab: RightPanelTab
  setRightPanelTab: (tab: RightPanelTab) => void
  mobileDrawerGoalId: string | null
  openMobileDrawer: (goalId: string) => void
  closeMobileDrawer: () => void
  reset: () => void
}

const coreInitialState = {
  statusFilter: 'all' as StatusFilter,
  expandedAreas: [] as string[],
  rightPanelTab: 'inu' as RightPanelTab,
  mobileDrawerGoalId: null as string | null,
}

// ── Combined state ─────────────────────────────────────────────────

export type RoadmapState = SelectionSlice & VersionSlice & CoreSlice

const initialState = {
  ...selectionInitialState,
  ...versionInitialState,
  ...coreInitialState,
}

// ── Combined store (slices pattern + persist for core) ─────────────

export const useRoadmapStore = create<RoadmapState>()(
  persist(
    (...args) => {
      const [set, get] = args

      return {
        // Selection slice (selection, panelMode, inlineMode, focusedGoalId, floatingPanel)
        ...createSelectionSlice(...args),

        // Version slice (version history, wizard, restore/delete direction)
        ...createVersionSlice(...args),

        // Core slice (inline — small enough to keep here)
        ...coreInitialState,

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
      }),
    }
  )
)

// === Selectors (use with useRoadmapStore(selector) for minimal re-renders) ===

export const selectSelection = (s: RoadmapState) => s.selection

export const selectGoalId = (s: RoadmapState): string | null => {
  const sel = s.selection
  if (sel.type === 'goal') return sel.id
  if (sel.type === 'group' || sel.type === 'task') return sel.goalId
  return null
}

export const selectSelectedNodeId = (s: RoadmapState): string | null =>
  s.selection.type === 'none' ? null : s.selection.id

export const selectPanelMode = (s: RoadmapState) => s.panelMode
export const selectRightPanelTab = (s: RoadmapState) => s.rightPanelTab
export const selectInlineMode = (s: RoadmapState) => s.inlineMode
export const selectStatusFilter = (s: RoadmapState) => s.statusFilter
export const selectMobileDrawerGoalId = (s: RoadmapState) => s.mobileDrawerGoalId
export const selectIsFloatingPanelOpen = (s: RoadmapState) => s.isFloatingPanelOpen
