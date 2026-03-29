import { create, type StateCreator } from 'zustand'

import type { RoadmapState } from './roadmap.store'

// ── Types ──────────────────────────────────────────────

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

// ── Slice interface ────────────────────────────────────

export interface SelectionSlice {
  selection: Selection
  select: (sel: Selection) => void
  clearSelection: () => void
  focusedGoalId: string | null
  focusGoal: (id: string) => void
  inlineMode: InlineMode
  setInlineMode: (mode: InlineMode) => void
  panelMode: PanelMode
  setPanelMode: (mode: PanelMode) => void
}

export const selectionInitialState = {
  selection: { type: 'none' } as Selection,
  focusedGoalId: null as string | null,
  inlineMode: null as InlineMode,
  panelMode: 'browse' as PanelMode,
}

// ── Helpers ────────────────────────────────────────────

function derivePanelMode(sel: Selection): PanelMode {
  switch (sel.type) {
    case 'none':
      return 'browse'
    case 'goal':
      return 'view'
    case 'direction':
      return 'view-direction'
    case 'area':
      return 'view-area'
    case 'group':
      return 'edit-group'
    case 'task':
      return 'edit-task'
  }
}

// ── Slice creator (for combined store composition) ─────

export const createSelectionSlice: StateCreator<RoadmapState, [], [], SelectionSlice> = (
  set,
  get
) => ({
  ...selectionInitialState,

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

    set({
      selection: sel,
      panelMode: derivePanelMode(sel),
      isFloatingPanelOpen: sel.type !== 'none',
    })
  },

  clearSelection: () =>
    set({
      selection: { type: 'none' },
      focusedGoalId: null,
      inlineMode: null,
      panelMode: 'browse',
      isFloatingPanelOpen: false,
    }),

  focusGoal: (id: string) => {
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

  setInlineMode: (mode: InlineMode) => set({ inlineMode: mode }),

  setPanelMode: (mode: PanelMode) => set({ panelMode: mode }),
})

// ── Standalone store (re-render isolation) ─────────────

export const useRoadmapSelectionStore = create<SelectionSlice>()((set, get) => ({
  ...selectionInitialState,

  select: (sel: Selection) => {
    const current = get()
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
    set({ selection: sel, panelMode: derivePanelMode(sel) })
  },

  clearSelection: () =>
    set({
      selection: { type: 'none' },
      focusedGoalId: null,
      inlineMode: null,
      panelMode: 'browse',
    }),

  focusGoal: (id: string) => {
    const current = get()
    if (current.focusedGoalId === id) {
      set({
        selection: { type: 'none' },
        focusedGoalId: null,
        inlineMode: null,
      })
      return
    }
    set({
      selection: { type: 'goal', id },
      focusedGoalId: id,
      inlineMode: null,
    })
  },

  setInlineMode: (mode: InlineMode) => set({ inlineMode: mode }),

  setPanelMode: (mode: PanelMode) => set({ panelMode: mode }),
}))

// ── Selectors ──────────────────────────────────────────

export const selectSelection = (s: SelectionSlice) => s.selection

export const selectGoalId = (s: SelectionSlice): string | null => {
  const sel = s.selection
  if (sel.type === 'goal') return sel.id
  if (sel.type === 'group' || sel.type === 'task') return sel.goalId
  return null
}

export const selectSelectedNodeId = (s: SelectionSlice): string | null =>
  s.selection.type === 'none' ? null : s.selection.id

export const selectPanelMode = (s: SelectionSlice) => s.panelMode
export const selectInlineMode = (s: SelectionSlice) => s.inlineMode
