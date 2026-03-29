import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { GoalStatus } from '@/types/entities'
import type { DiagnosisScope, DiagnosisAction } from '@/lib/ai/types'

export type StatusFilter = GoalStatus | 'all'

export type SelectedNodeType = 'direction' | 'area' | 'goal' | 'group' | 'task'

export type TreeLayoutDirection = 'vertical' | 'horizontal'

export type RightPanelTab = 'roadmap' | 'ai-chat'

/** Unified selection state */
export type Selection =
  | { type: 'none' }
  | { type: 'direction'; id: string }
  | { type: 'area'; id: string }
  | { type: 'goal'; id: string }
  | { type: 'group'; id: string; goalId: string }
  | { type: 'task'; id: string; goalId: string }

export type PanelMode =
  | 'browse'
  | 'view'
  | 'edit-group'
  | 'create-group'
  | 'edit-task'
  | 'view-direction'
  | 'edit-direction'
  | 'view-area'
  | 'edit-area'

/** Inline editing mode within a GoalAccordionItem (desktop only) */
export type InlineMode =
  | null
  | 'create-goal'
  | 'create-group'
  | { type: 'edit-group'; groupId: string }
  | 'create-task'
  | { type: 'create-task-in-group'; groupId: string }
  | { type: 'edit-task'; taskId: string }

interface RoadmapState {
  // Unified selection
  selection: Selection
  select: (sel: Selection) => void
  clearSelection: () => void

  // Filters
  statusFilter: StatusFilter
  setStatusFilter: (filter: StatusFilter) => void

  // UI state
  expandedAreas: string[]
  toggleAreaExpanded: (areaId: string) => void
  setAllAreasExpanded: (areaIds: string[]) => void

  // Focused goal (desktop: auto-expand + scroll in GoalBrowsePanel)
  focusedGoalId: string | null
  focusGoal: (id: string) => void

  // Inline mode (desktop: which inline form is shown inside an accordion)
  inlineMode: InlineMode
  setInlineMode: (mode: InlineMode) => void

  // Panel mode system
  panelMode: PanelMode
  setPanelMode: (mode: PanelMode) => void

  // Right panel tab
  rightPanelTab: RightPanelTab
  setRightPanelTab: (tab: RightPanelTab) => void

  // Tree layout direction
  treeLayout: TreeLayoutDirection
  setTreeLayout: (layout: TreeLayoutDirection) => void

  // Diagnosis modal
  isDiagnosisOpen: boolean
  diagnosisInitialScope: DiagnosisScope | null
  diagnosisInitialTargetId: string | null
  setIsDiagnosisOpen: (open: boolean) => void
  openDiagnosis: (scope?: DiagnosisScope, targetId?: string) => void

  // Pending diagnosis action (consumed by GoalBrowsePanel after navigation)
  pendingDiagnosisAction: DiagnosisAction | null
  setPendingDiagnosisAction: (action: DiagnosisAction | null) => void

  // Version management
  isVersionHistoryOpen: boolean
  setIsVersionHistoryOpen: (open: boolean) => void
  isNewVersionWizardOpen: boolean
  setIsNewVersionWizardOpen: (open: boolean) => void
  restoreSourceDirectionId: string | null
  setRestoreSourceDirectionId: (id: string | null) => void
  deleteTargetDirectionId: string | null
  setDeleteTargetDirectionId: (id: string | null) => void

  // Floating panel (roadmap only)
  isFloatingPanelOpen: boolean
  setFloatingPanelOpen: (open: boolean) => void
  toggleFloatingPanel: () => void

  // Mobile goal detail drawer
  mobileDrawerGoalId: string | null
  openMobileDrawer: (goalId: string) => void
  closeMobileDrawer: () => void

  // Reset
  reset: () => void
}

const initialState = {
  selection: { type: 'none' } as Selection,
  statusFilter: 'all' as StatusFilter,
  expandedAreas: [] as string[],
  focusedGoalId: null as string | null,
  inlineMode: null as InlineMode,
  panelMode: 'browse' as PanelMode,
  rightPanelTab: 'roadmap' as RightPanelTab,
  treeLayout: 'horizontal' as TreeLayoutDirection,
  isDiagnosisOpen: false,
  diagnosisInitialScope: null as DiagnosisScope | null,
  diagnosisInitialTargetId: null as string | null,
  pendingDiagnosisAction: null as DiagnosisAction | null,
  isVersionHistoryOpen: false,
  isNewVersionWizardOpen: false,
  restoreSourceDirectionId: null as string | null,
  deleteTargetDirectionId: null as string | null,
  mobileDrawerGoalId: null as string | null,
  isFloatingPanelOpen: false,
}

export const useRoadmapStore = create<RoadmapState>()(
  persist(
    (set, get) => ({
      ...initialState,

      select: (sel: Selection) => {
        const current = get()

        // Toggle: clicking the same entity deselects
        if (
          sel.type !== 'none' &&
          current.selection.type === sel.type &&
          'id' in sel &&
          'id' in current.selection &&
          sel.id === current.selection.id
        ) {
          get().clearSelection()
          return
        }

        // Derive panelMode from selection type
        const panelMode: PanelMode =
          sel.type === 'none'
            ? 'browse'
            : sel.type === 'goal'
              ? 'view'
              : sel.type === 'direction'
                ? 'view-direction'
                : sel.type === 'area'
                  ? 'view-area'
                  : sel.type === 'group'
                    ? 'edit-group'
                    : sel.type === 'task'
                      ? 'edit-task'
                      : 'browse'

        set({
          selection: sel,
          panelMode,
          isFloatingPanelOpen: sel.type !== 'none',
        })
      },

      setStatusFilter: (filter) => set({ statusFilter: filter }),

      toggleAreaExpanded: (areaId) => {
        const { expandedAreas } = get()
        const isExpanded = expandedAreas.includes(areaId)
        set({
          expandedAreas: isExpanded
            ? expandedAreas.filter((id) => id !== areaId)
            : [...expandedAreas, areaId],
        })
      },

      setAllAreasExpanded: (areaIds) => set({ expandedAreas: areaIds }),

      clearSelection: () =>
        set({
          selection: { type: 'none' },
          focusedGoalId: null,
          inlineMode: null,
          panelMode: 'browse',
          isFloatingPanelOpen: false,
        }),

      focusGoal: (id) => {
        const current = get()
        if (current.focusedGoalId === id) {
          set({
            selection: { type: 'none' },
            focusedGoalId: null,
            inlineMode: null,
            isFloatingPanelOpen: false,
          })
          return
        }
        set({
          selection: { type: 'goal', id },
          focusedGoalId: id,
          inlineMode: null,
          isFloatingPanelOpen: true,
          // Do NOT change panelMode — stays 'browse' for desktop
        })
      },

      setInlineMode: (mode) => set({ inlineMode: mode }),

      setPanelMode: (mode) => set({ panelMode: mode }),

      setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

      setTreeLayout: (layout) => set({ treeLayout: layout }),

      setIsDiagnosisOpen: (open) =>
        set({
          isDiagnosisOpen: open,
          ...(open ? {} : { diagnosisInitialScope: null, diagnosisInitialTargetId: null }),
        }),

      openDiagnosis: (scope, targetId) =>
        set({
          isDiagnosisOpen: true,
          diagnosisInitialScope: scope ?? null,
          diagnosisInitialTargetId: targetId ?? null,
        }),

      setPendingDiagnosisAction: (action) => set({ pendingDiagnosisAction: action }),

      setIsVersionHistoryOpen: (open) => set({ isVersionHistoryOpen: open }),
      setIsNewVersionWizardOpen: (open) => set({ isNewVersionWizardOpen: open }),
      setRestoreSourceDirectionId: (id) => set({ restoreSourceDirectionId: id }),
      setDeleteTargetDirectionId: (id) => set({ deleteTargetDirectionId: id }),

      setFloatingPanelOpen: (open) => set({ isFloatingPanelOpen: open }),
      toggleFloatingPanel: () => set((s) => ({ isFloatingPanelOpen: !s.isFloatingPanelOpen })),

      openMobileDrawer: (goalId) => set({ mobileDrawerGoalId: goalId }),
      closeMobileDrawer: () => set({ mobileDrawerGoalId: null }),

      reset: () => set(initialState),
    }),
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
