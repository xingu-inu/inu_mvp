import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  AREA_PRESETS_EXTENDED,
  GOAL_CHIP_OPTIONS,
  VALUE_AREA_MAPPING,
  LIFESTYLE_AREA_MAPPING,
  ONBOARDING_STEPS_V2,
  ONBOARDING_STEPS_V3,
  type OnboardingStepV3,
  type DefaultAreaOption,
} from '@/lib/constants/onboarding'
import { generateDirectionSentence } from '@/lib/utils/direction-generator'
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

// ============================================
// Legacy Types (v2 guided mode)
// ============================================
interface OnboardingTask {
  name: string
}

interface OnboardingGoal {
  name: string
  why?: string
}

// ============================================
// Combined Step Type
// ============================================
type OnboardingStep = OnboardingStepV3 | string

interface OnboardingState {
  currentStep: OnboardingStep
  direction: 'forward' | 'backward'
  isNavigating: boolean
  isGuidedMode: boolean

  // V3 Step 2: Brain Dump
  selectedGoalChips: string[]
  customGoals: string[]

  // V3 Step 3: Organize
  organizedGoals: OrganizedGoal[]
  derivedAreas: DefaultAreaOption[]

  // V3 Step 4: Prioritize
  activeGoalIds: string[]

  // V3 Step 5: Actions
  suggestedTasks: SuggestedTask[]

  // V3 Step 6 / V2 Step 2: Direction
  generatedDirection: string | null
  directionMode: DirectionMode | null
  editedDirection: string | null

  // V2 Legacy (guided mode)
  selectedLifestyles: string[]
  selectedValues: string[]
  customLifestyle: string | null
  customValue: string | null
  selectedAreas: DefaultAreaOption[]
  selectedGoalArea: DefaultAreaOption | null
  firstGoal: OnboardingGoal | null
  firstTask: OnboardingTask | null

  // V3 Brain Dump Actions
  toggleGoalChip: (chipId: string) => void
  addCustomGoal: (goal: string) => void
  removeCustomGoal: (index: number) => void
  organizeGoals: () => void
  overrideGoalArea: (goalId: string, newArea: AreaType) => void
  toggleActiveGoal: (goalId: string) => void
  setSuggestedTasks: (tasks: SuggestedTask[]) => void
  toggleTaskAccepted: (goalId: string, taskName: string) => void
  setGeneratedDirection: (direction: string) => void

  // V2 Legacy Actions (guided mode)
  setLifestyles: (lifestyles: string[]) => void
  setValues: (values: string[]) => void
  setCustomLifestyle: (lifestyle: string | null) => void
  setCustomValue: (value: string | null) => void
  generateDirection: () => void
  setDirectionMode: (mode: DirectionMode | null) => void
  setEditedDirection: (direction: string) => void
  setAreas: (areas: DefaultAreaOption[]) => void
  toggleArea: (area: DefaultAreaOption) => void
  computePreSelectedAreas: () => void
  setGoalArea: (area: DefaultAreaOption | null) => void
  setGoal: (goal: OnboardingGoal | null) => void
  setTask: (task: OnboardingTask | null) => void

  // Navigation
  switchToGuidedMode: () => void
  goToCompletion: () => void
  nextStep: () => void
  prevStep: () => void
  setNavigating: (value: boolean) => void
  reset: () => void
}

const initialState = {
  currentStep: 'welcome' as OnboardingStep,
  direction: 'forward' as const,
  isNavigating: false,
  isGuidedMode: false,

  // V3
  selectedGoalChips: [] as string[],
  customGoals: [] as string[],
  organizedGoals: [] as OrganizedGoal[],
  derivedAreas: [] as DefaultAreaOption[],
  activeGoalIds: [] as string[],
  suggestedTasks: [] as SuggestedTask[],

  // Shared
  generatedDirection: null as string | null,
  directionMode: null as DirectionMode | null,
  editedDirection: null as string | null,

  // V2 legacy
  selectedLifestyles: [] as string[],
  selectedValues: [] as string[],
  customLifestyle: null as string | null,
  customValue: null as string | null,
  selectedAreas: [] as DefaultAreaOption[],
  selectedGoalArea: null as DefaultAreaOption | null,
  firstGoal: null as OnboardingGoal | null,
  firstTask: null as OnboardingTask | null,
}

function getStepOrder(isGuidedMode: boolean): readonly string[] {
  return isGuidedMode ? ONBOARDING_STEPS_V2 : ONBOARDING_STEPS_V3
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ============================================
      // V3 Brain Dump Actions
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
          areaType: 'custom' as AreaType,
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
        } else if (activeGoalIds.length < 3) {
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

      // ============================================
      // V2 Legacy Actions (guided mode)
      // ============================================
      setLifestyles: (lifestyles) => set({ selectedLifestyles: lifestyles }),
      setValues: (values) => set({ selectedValues: values }),
      setCustomLifestyle: (lifestyle) => set({ customLifestyle: lifestyle }),
      setCustomValue: (value) => set({ customValue: value }),

      generateDirection: () => {
        const { selectedLifestyles, selectedValues, customLifestyle, customValue } = get()
        const direction = generateDirectionSentence(
          selectedLifestyles,
          selectedValues,
          customLifestyle,
          customValue
        )
        set({ generatedDirection: direction })
      },

      setDirectionMode: (mode) => set({ directionMode: mode }),
      setEditedDirection: (direction) => set({ editedDirection: direction }),

      setAreas: (areas) => set({ selectedAreas: areas }),
      toggleArea: (area) => {
        const { selectedAreas } = get()
        const exists = selectedAreas.some((a) => a.type === area.type)
        if (exists) {
          set({ selectedAreas: selectedAreas.filter((a) => a.type !== area.type) })
        } else {
          set({ selectedAreas: [...selectedAreas, area] })
        }
      },

      computePreSelectedAreas: () => {
        const { selectedValues, selectedLifestyles, selectedAreas } = get()
        if (selectedAreas.length > 0) return

        const areaTypes = new Set<string>()
        selectedValues.forEach((valueId) => {
          const mapped = VALUE_AREA_MAPPING[valueId]
          if (mapped) mapped.forEach((t) => areaTypes.add(t))
        })
        selectedLifestyles.forEach((lifestyleId) => {
          const mapped = LIFESTYLE_AREA_MAPPING[lifestyleId]
          if (mapped) mapped.forEach((t) => areaTypes.add(t))
        })

        const preSelected = AREA_PRESETS_EXTENDED.filter((a) => areaTypes.has(a.type))
        set({ selectedAreas: preSelected.slice(0, 3) })
      },

      setGoalArea: (area) => set({ selectedGoalArea: area }),
      setGoal: (goal) => set({ firstGoal: goal }),
      setTask: (task) => set({ firstTask: task }),

      // ============================================
      // Navigation
      // ============================================
      switchToGuidedMode: () =>
        set({
          isGuidedMode: true,
          currentStep: 'values',
          direction: 'forward',
        }),

      goToCompletion: () => set({ currentStep: 'completion', direction: 'forward' }),
      setNavigating: (value) => set({ isNavigating: value }),

      nextStep: () => {
        const { isGuidedMode } = get()
        const stepOrder = getStepOrder(isGuidedMode)
        const currentIndex = stepOrder.indexOf(get().currentStep as string)
        if (currentIndex >= 0 && currentIndex < stepOrder.length - 1) {
          set({
            currentStep: stepOrder[currentIndex + 1] as OnboardingStep,
            direction: 'forward',
          })
        } else if (currentIndex === stepOrder.length - 1) {
          set({ currentStep: 'completion', direction: 'forward' })
        }
      },

      prevStep: () => {
        const { isGuidedMode } = get()
        const stepOrder = getStepOrder(isGuidedMode)
        const currentIndex = stepOrder.indexOf(get().currentStep as string)
        if (currentIndex > 0) {
          set({
            currentStep: stepOrder[currentIndex - 1] as OnboardingStep,
            direction: 'backward',
          })
        }
      },

      reset: () => set(initialState),
    }),
    {
      name: 'inu-onboarding',
      version: 3,
      migrate: (persistedState, version) => {
        if (version < 3) {
          return initialState
        }
        return persistedState as OnboardingState
      },
      partialize: (state) => ({
        currentStep: state.currentStep,
        isGuidedMode: state.isGuidedMode,
        selectedGoalChips: state.selectedGoalChips,
        customGoals: state.customGoals,
        organizedGoals: state.organizedGoals,
        derivedAreas: state.derivedAreas,
        activeGoalIds: state.activeGoalIds,
        suggestedTasks: state.suggestedTasks,
        generatedDirection: state.generatedDirection,
        directionMode: state.directionMode,
        editedDirection: state.editedDirection,
        selectedLifestyles: state.selectedLifestyles,
        selectedValues: state.selectedValues,
        customLifestyle: state.customLifestyle,
        customValue: state.customValue,
        selectedAreas: state.selectedAreas,
        selectedGoalArea: state.selectedGoalArea,
        firstGoal: state.firstGoal,
        firstTask: state.firstTask,
      }),
    }
  )
)
