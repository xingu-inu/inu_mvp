import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  AREA_PRESETS_EXTENDED,
  VALUE_AREA_MAPPING,
  LIFESTYLE_AREA_MAPPING,
  ONBOARDING_STEPS_V2,
  type OnboardingStepV2,
  type DefaultAreaOption,
} from '@/lib/constants/onboarding'
import { generateDirectionSentence } from '@/lib/utils/direction-generator'

export type DirectionMode = 'accept' | 'edit' | 'explore'

interface OnboardingTask {
  name: string
}

interface OnboardingGoal {
  name: string
  why?: string
}

interface OnboardingState {
  currentStep: OnboardingStepV2
  direction: 'forward' | 'backward'
  isNavigating: boolean

  // Step 1: Values
  selectedLifestyles: string[]
  selectedValues: string[]
  customLifestyle: string | null
  customValue: string | null

  // Step 2: Direction
  generatedDirection: string | null
  directionMode: DirectionMode | null
  editedDirection: string | null

  // Step 3: Areas (multi-select)
  selectedAreas: DefaultAreaOption[]

  // Step 4: First Goal + Task
  selectedGoalArea: DefaultAreaOption | null
  firstGoal: OnboardingGoal | null
  firstTask: OnboardingTask | null

  // Actions
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
  goToCompletion: () => void
  nextStep: () => void
  prevStep: () => void
  setNavigating: (value: boolean) => void
  reset: () => void
}

const STEP_ORDER = ONBOARDING_STEPS_V2

const initialState = {
  currentStep: 'welcome' as OnboardingStepV2,
  direction: 'forward' as const,
  isNavigating: false,
  selectedLifestyles: [] as string[],
  selectedValues: [] as string[],
  customLifestyle: null as string | null,
  customValue: null as string | null,
  generatedDirection: null as string | null,
  directionMode: null as DirectionMode | null,
  editedDirection: null as string | null,
  selectedAreas: [] as DefaultAreaOption[],
  selectedGoalArea: null as DefaultAreaOption | null,
  firstGoal: null as OnboardingGoal | null,
  firstTask: null as OnboardingTask | null,
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,

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
        // Only compute if no areas are already selected (don't overwrite user choices)
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
        // Limit to 3 pre-selections max
        set({ selectedAreas: preSelected.slice(0, 3) })
      },

      setGoalArea: (area) => set({ selectedGoalArea: area }),
      setGoal: (goal) => set({ firstGoal: goal }),
      setTask: (task) => set({ firstTask: task }),

      goToCompletion: () => set({ currentStep: 'completion', direction: 'forward' }),
      setNavigating: (value) => set({ isNavigating: value }),

      nextStep: () => {
        const currentIndex = STEP_ORDER.indexOf(get().currentStep as (typeof STEP_ORDER)[number])
        if (currentIndex >= 0 && currentIndex < STEP_ORDER.length - 1) {
          set({
            currentStep: STEP_ORDER[currentIndex + 1],
            direction: 'forward',
          })
        }
      },

      prevStep: () => {
        const currentIndex = STEP_ORDER.indexOf(get().currentStep as (typeof STEP_ORDER)[number])
        if (currentIndex > 0) {
          set({
            currentStep: STEP_ORDER[currentIndex - 1],
            direction: 'backward',
          })
        }
      },

      reset: () => set(initialState),
    }),
    {
      name: 'inu-onboarding',
      version: 2,
      migrate: (persistedState, version) => {
        // Reset state if coming from v1 (old 3-step onboarding)
        if (version < 2) {
          return initialState
        }
        return persistedState as OnboardingState
      },
      partialize: (state) => ({
        currentStep: state.currentStep,
        selectedLifestyles: state.selectedLifestyles,
        selectedValues: state.selectedValues,
        customLifestyle: state.customLifestyle,
        customValue: state.customValue,
        generatedDirection: state.generatedDirection,
        directionMode: state.directionMode,
        editedDirection: state.editedDirection,
        selectedAreas: state.selectedAreas,
        selectedGoalArea: state.selectedGoalArea,
        firstGoal: state.firstGoal,
        firstTask: state.firstTask,
      }),
    }
  )
)
