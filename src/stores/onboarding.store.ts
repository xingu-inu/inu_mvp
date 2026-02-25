import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  AREA_PRESETS_EXTENDED,
  GOAL_CHIP_OPTIONS,
  ONBOARDING_STEPS_V3,
  classifyCustomGoalArea,
  type OnboardingStepV3,
  type DefaultAreaOption,
} from '@/lib/constants/onboarding'
import type { AreaType } from '@/types/entities'

export type DirectionMode = 'accept' | 'edit' | 'explore'

// ============================================
// V3 Brain Dump Types
// ============================================
export interface OrganizedGoal {
  id: string
  name: string
  areaType: AreaType
  isCustom: boolean
  userOverriddenArea?: AreaType
}

export interface SuggestedTask {
  goalId: string
  name: string
  accepted: boolean
}

interface OnboardingState {
  currentStep: OnboardingStepV3
  direction: 'forward' | 'backward'
  isNavigating: boolean

  // Step 2: Brain Dump
  selectedGoalChips: string[]
  customGoals: string[]

  // Step 3: Organize
  organizedGoals: OrganizedGoal[]
  derivedAreas: DefaultAreaOption[]

  // Prioritize
  activeGoalIds: string[]

  // Actions (AI-suggested tasks)
  suggestedTasks: SuggestedTask[]

  // Direction
  generatedDirection: string | null
  directionMode: DirectionMode | null
  editedDirection: string | null

  // Brain Dump Actions
  toggleGoalChip: (chipId: string) => void
  addCustomGoal: (goal: string) => void
  removeCustomGoal: (index: number) => void
  organizeGoals: () => void
  organizeAndPrepareGoals: () => void
  overrideGoalArea: (goalId: string, newArea: AreaType) => void
  toggleActiveGoal: (goalId: string) => void
  setSuggestedTasks: (tasks: SuggestedTask[]) => void
  toggleTaskAccepted: (goalId: string, taskName: string) => void
  setGeneratedDirection: (direction: string) => void
  setDirectionMode: (mode: DirectionMode | null) => void
  setEditedDirection: (direction: string) => void

  // Navigation
  nextStep: () => void
  prevStep: () => void
  setNavigating: (value: boolean) => void
  reset: () => void
}

const initialState = {
  currentStep: 'welcome' as OnboardingStepV3,
  direction: 'forward' as const,
  isNavigating: false,

  selectedGoalChips: [] as string[],
  customGoals: [] as string[],
  organizedGoals: [] as OrganizedGoal[],
  derivedAreas: [] as DefaultAreaOption[],
  activeGoalIds: [] as string[],
  suggestedTasks: [] as SuggestedTask[],

  generatedDirection: null as string | null,
  directionMode: null as DirectionMode | null,
  editedDirection: null as string | null,
}

function getStepOrder(): readonly string[] {
  return ONBOARDING_STEPS_V3
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ============================================
      // Brain Dump Actions
      // ============================================
      toggleGoalChip: (chipId) => {
        const { selectedGoalChips } = get()
        if (selectedGoalChips.includes(chipId)) {
          set({ selectedGoalChips: selectedGoalChips.filter((id) => id !== chipId) })
        } else {
          set({ selectedGoalChips: [...selectedGoalChips, chipId] })
        }
      },

      addCustomGoal: (goal) => {
        const trimmed = goal.trim()
        if (!trimmed) return
        const { customGoals } = get()
        if (customGoals.includes(trimmed)) return
        set({ customGoals: [...customGoals, trimmed] })
      },

      removeCustomGoal: (index) => {
        const { customGoals } = get()
        set({ customGoals: customGoals.filter((_, i) => i !== index) })
      },

      organizeGoals: () => {
        const { selectedGoalChips, customGoals } = get()

        const chipGoals: OrganizedGoal[] = selectedGoalChips
          .map((chipId) => {
            const chip = GOAL_CHIP_OPTIONS.find((c) => c.id === chipId)
            if (!chip) return null
            return {
              id: chipId,
              name: chip.label,
              areaType: chip.areaType,
              isCustom: false,
            }
          })
          .filter((g): g is OrganizedGoal => g !== null)

        const customOrganized: OrganizedGoal[] = customGoals.map((goal, i) => ({
          id: `custom-${i}`,
          name: goal,
          areaType: classifyCustomGoalArea(goal),
          isCustom: true,
        }))

        const allGoals = [...chipGoals, ...customOrganized]

        const areaTypes = new Set<AreaType>()
        allGoals.forEach((g) => {
          const effectiveArea = g.userOverriddenArea || g.areaType
          if (effectiveArea !== 'custom') areaTypes.add(effectiveArea)
        })

        const derivedAreas = AREA_PRESETS_EXTENDED.filter((a) => areaTypes.has(a.type as AreaType))

        set({ organizedGoals: allGoals, derivedAreas })
      },

      organizeAndPrepareGoals: () => {
        const { selectedGoalChips, customGoals } = get()

        const chipGoals: OrganizedGoal[] = selectedGoalChips
          .map((chipId) => {
            const chip = GOAL_CHIP_OPTIONS.find((c) => c.id === chipId)
            if (!chip) return null
            return {
              id: chipId,
              name: chip.label,
              areaType: chip.areaType,
              isCustom: false,
            }
          })
          .filter((g): g is OrganizedGoal => g !== null)

        const customOrganized: OrganizedGoal[] = customGoals.map((goal, i) => ({
          id: `custom-${i}`,
          name: goal,
          areaType: classifyCustomGoalArea(goal),
          isCustom: true,
        }))

        const allGoals = [...chipGoals, ...customOrganized]

        const areaTypes = new Set<AreaType>()
        allGoals.forEach((g) => {
          const effectiveArea = g.userOverriddenArea || g.areaType
          if (effectiveArea !== 'custom') areaTypes.add(effectiveArea)
        })

        const derivedAreas = AREA_PRESETS_EXTENDED.filter((a) => areaTypes.has(a.type as AreaType))

        // All goals are active — no prioritization step
        const allIds = allGoals.map((g) => g.id)

        set({ organizedGoals: allGoals, derivedAreas, activeGoalIds: allIds })
      },

      overrideGoalArea: (goalId, newArea) => {
        const { organizedGoals } = get()
        const updated = organizedGoals.map((g) =>
          g.id === goalId ? { ...g, userOverriddenArea: newArea } : g
        )

        const areaTypes = new Set<AreaType>()
        updated.forEach((g) => {
          const effectiveArea = g.userOverriddenArea || g.areaType
          if (effectiveArea !== 'custom') areaTypes.add(effectiveArea)
        })
        const derivedAreas = AREA_PRESETS_EXTENDED.filter((a) => areaTypes.has(a.type as AreaType))

        set({ organizedGoals: updated, derivedAreas })
      },

      toggleActiveGoal: (goalId) => {
        const { activeGoalIds } = get()
        if (activeGoalIds.includes(goalId)) {
          set({ activeGoalIds: activeGoalIds.filter((id) => id !== goalId) })
        } else {
          set({ activeGoalIds: [...activeGoalIds, goalId] })
        }
      },

      setSuggestedTasks: (tasks) => set({ suggestedTasks: tasks }),

      toggleTaskAccepted: (goalId, taskName) => {
        const { suggestedTasks } = get()
        set({
          suggestedTasks: suggestedTasks.map((t) =>
            t.goalId === goalId && t.name === taskName ? { ...t, accepted: !t.accepted } : t
          ),
        })
      },

      setGeneratedDirection: (direction) => set({ generatedDirection: direction }),
      setDirectionMode: (mode) => set({ directionMode: mode }),
      setEditedDirection: (direction) => set({ editedDirection: direction }),

      // ============================================
      // Navigation
      // ============================================
      setNavigating: (value) => set({ isNavigating: value }),

      nextStep: () => {
        const stepOrder = getStepOrder()
        const currentIndex = stepOrder.indexOf(get().currentStep as string)
        if (currentIndex >= 0 && currentIndex < stepOrder.length - 1) {
          set({
            currentStep: stepOrder[currentIndex + 1] as OnboardingStepV3,
            direction: 'forward',
          })
        }
      },

      prevStep: () => {
        const stepOrder = getStepOrder()
        const currentIndex = stepOrder.indexOf(get().currentStep as string)
        if (currentIndex > 0) {
          set({
            currentStep: stepOrder[currentIndex - 1] as OnboardingStepV3,
            direction: 'backward',
          })
        }
      },

      reset: () => set(initialState),
    }),
    {
      name: 'inu-onboarding',
      version: 6,
      migrate: (persistedState, version) => {
        if (version < 6) {
          return initialState
        }
        return persistedState as OnboardingState
      },
      partialize: (state) => ({
        currentStep: state.currentStep,
        selectedGoalChips: state.selectedGoalChips,
        customGoals: state.customGoals,
        organizedGoals: state.organizedGoals,
        derivedAreas: state.derivedAreas,
        activeGoalIds: state.activeGoalIds,
        suggestedTasks: state.suggestedTasks,
        generatedDirection: state.generatedDirection,
        directionMode: state.directionMode,
        editedDirection: state.editedDirection,
      }),
    }
  )
)
