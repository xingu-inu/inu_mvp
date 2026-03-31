import { create, type StateCreator } from 'zustand'

import type { RoadmapState } from './roadmap.store'

// ── Slice interface ────────────────────────────────────

export interface VersionSlice {
  isVersionHistoryOpen: boolean
  setIsVersionHistoryOpen: (open: boolean) => void
  isNewVersionWizardOpen: boolean
  setIsNewVersionWizardOpen: (open: boolean) => void
  restoreSourceDirectionId: string | null
  setRestoreSourceDirectionId: (id: string | null) => void
  deleteTargetDirectionId: string | null
  setDeleteTargetDirectionId: (id: string | null) => void
}

export const versionInitialState = {
  isVersionHistoryOpen: false,
  isNewVersionWizardOpen: false,
  restoreSourceDirectionId: null as string | null,
  deleteTargetDirectionId: null as string | null,
}

// ── Shared action creators (DRY — used by both slice and standalone store) ─

function createVersionActions(set: (partial: Partial<VersionSlice>) => void) {
  return {
    setIsVersionHistoryOpen: (open: boolean) => set({ isVersionHistoryOpen: open }),
    setIsNewVersionWizardOpen: (open: boolean) => set({ isNewVersionWizardOpen: open }),
    setRestoreSourceDirectionId: (id: string | null) => set({ restoreSourceDirectionId: id }),
    setDeleteTargetDirectionId: (id: string | null) => set({ deleteTargetDirectionId: id }),
  }
}

// ── Slice creator (for combined store composition) ─────

export const createVersionSlice: StateCreator<RoadmapState, [], [], VersionSlice> = (set) => ({
  ...versionInitialState,
  ...createVersionActions(set),
})

// ── Standalone store (re-render isolation for new code) ─

export const useRoadmapVersionStore = create<VersionSlice>()((set) => ({
  ...versionInitialState,
  ...createVersionActions(set),
}))
