import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  AREA_PRESETS_EXTENDED,
  GOAL_CHIP_OPTIONS,
  ONBOARDING_STEPS_V3,
  ONBOARDING_STEPS_V4,
  classifyCustomGoalArea,
  type OnboardingFlowVersion,
  type OnboardingStep,
  type DefaultAreaOption,
} from '@/lib/constants/onboarding'
import type { AreaType } from '@/types/entities'

export type DirectionMode = 'accept' | 'edit' | 'explore'
export type AiEnhanceStatus = 'idle' | 'loading' | 'done' | 'error'

// ============================================
// V3/V4 Shared Types
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

export function buildSuggestedTaskKey(goalId: string, taskName: string): string {
  return `${goalId}::${taskName}`
}

interface OnboardingState {
  flowVersion: OnboardingFlowVersion
  currentStep: OnboardingStep
  direction: 'forward' | 'backward'
  isNavigating: boolean
  startedAt: number | null

  // Step 2: Goal capture
  selectedGoalChips: string[]
  customGoals: string[]

  // Step 3: Prepare onboarding payload
  organizedGoals: OrganizedGoal[]
  derivedAreas: DefaultAreaOption[]
  activeGoalIds: string[]
  suggestedTasks: SuggestedTask[]

  // V4 additions
  primaryTaskId: string | null
  aiEnhanceStatus: AiEnhanceStatus

  // V3 compatibility
  generatedDirection: string | null
  directionMode: DirectionMode | null
  editedDirection: string | null

  // Step actions
  toggleGoalChip: (chipId: string) => void
  mergeCustomGoals: (goals: string[]) => void
  addCustomGoal: (goal: string) => void
  removeCustomGoal: (index: number) => void
  organizeGoals: () => void
  organizeAndPrepareGoals: () => void
  overrideGoalArea: (goalId: string, newArea: AreaType) => void
  toggleActiveGoal: (goalId: string) => void
  setSuggestedTasks: (tasks: SuggestedTask[]) => void
  toggleTaskAccepted: (goalId: string, taskName: string) => void
  setPrimaryTask: (taskKey: string | null) => void
  setAiEnhanceStatus: (status: AiEnhanceStatus) => void

  // V3 compatibility actions
  setGeneratedDirection: (direction: string) => void
  setDirectionMode: (mode: DirectionMode | null) => void
  setEditedDirection: (direction: string) => void

  // Navigation
  setFlowVersion: (version: OnboardingFlowVersion) => void
  markStarted: () => void
  nextStep: () => void
  prevStep: () => void
  setNavigating: (value: boolean) => void
  reset: () => void
}

const initialState = {
  flowVersion: 'v4' as OnboardingFlowVersion,
  currentStep: 'welcome' as OnboardingStep,
  direction: 'forward' as const,
  isNavigating: false,
  startedAt: null as number | null,

  selectedGoalChips: [] as string[],
  customGoals: [] as string[],
  organizedGoals: [] as OrganizedGoal[],
  derivedAreas: [] as DefaultAreaOption[],
  activeGoalIds: [] as string[],
  suggestedTasks: [] as SuggestedTask[],

  primaryTaskId: null as string | null,
  aiEnhanceStatus: 'idle' as AiEnhanceStatus,

  generatedDirection: null as string | null,
  directionMode: null as DirectionMode | null,
  editedDirection: null as string | null,
}

const V3_STEP_SET = new Set<string>(ONBOARDING_STEPS_V3)
const V4_STEP_SET = new Set<string>(ONBOARDING_STEPS_V4)

const TO_V4_STEP: Partial<Record<OnboardingStep, OnboardingStep>> = {
  'brain-dump': 'goal-capture',
  'life-organized': 'first-action',
}

const TO_V3_STEP: Partial<Record<OnboardingStep, OnboardingStep>> = {
  'goal-capture': 'brain-dump',
  'first-action': 'life-organized',
}

function getStepOrder(version: OnboardingFlowVersion): readonly OnboardingStep[] {
  return (version === 'v3' ? ONBOARDING_STEPS_V3 : ONBOARDING_STEPS_V4) as readonly OnboardingStep[]
}

function normalizeCurrentStep(step: unknown, flowVersion: OnboardingFlowVersion): OnboardingStep {
  const value = typeof step === 'string' ? step : 'welcome'

  if (flowVersion === 'v4') {
    if (value === 'brain-dump') return 'goal-capture'
    if (value === 'life-organized') return 'first-action'
    return V4_STEP_SET.has(value) ? (value as OnboardingStep) : 'welcome'
  }

  if (value === 'goal-capture') return 'brain-dump'
  if (value === 'first-action') return 'life-organized'
  return V3_STEP_SET.has(value) ? (value as OnboardingStep) : 'welcome'
}

function uniqueByCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }

  return result
}

function buildOrganizedData(selectedGoalChips: string[], customGoals: string[]) {
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
    .filter((goal): goal is OrganizedGoal => goal !== null)

  const normalizedCustomGoals = uniqueByCaseInsensitive(customGoals)

  const customOrganized: OrganizedGoal[] = normalizedCustomGoals.map((goal, i) => ({
    id: `custom-${i}`,
    name: goal,
    areaType: classifyCustomGoalArea(goal),
    isCustom: true,
  }))

  const allGoals = [...chipGoals, ...customOrganized]

  const areaTypes = new Set<AreaType>()
  allGoals.forEach((goal) => {
    const effectiveArea = goal.userOverriddenArea || goal.areaType
    if (effectiveArea !== 'custom') areaTypes.add(effectiveArea)
  })

  const derivedAreas = AREA_PRESETS_EXTENDED.filter((area) => areaTypes.has(area.type as AreaType))

  return { allGoals, derivedAreas, normalizedCustomGoals }
}

function resolvePrimaryTaskId(
  tasks: SuggestedTask[],
  prevPrimaryTaskId: string | null
): string | null {
  const acceptedTaskKeys = tasks
    .filter((task) => task.accepted)
    .map((task) => buildSuggestedTaskKey(task.goalId, task.name))

  if (prevPrimaryTaskId && acceptedTaskKeys.includes(prevPrimaryTaskId)) {
    return prevPrimaryTaskId
  }

  return acceptedTaskKeys[0] ?? null
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ============================================
      // Goal capture actions
      // ============================================
      toggleGoalChip: (chipId) => {
        const { selectedGoalChips } = get()
        if (selectedGoalChips.includes(chipId)) {
          set({ selectedGoalChips: selectedGoalChips.filter((id) => id !== chipId) })
        } else {
          set({ selectedGoalChips: [...selectedGoalChips, chipId] })
        }
      },

      mergeCustomGoals: (goals) => {
        const merged = uniqueByCaseInsensitive([...get().customGoals, ...goals])
        set({ customGoals: merged.slice(0, 5) })
      },

      addCustomGoal: (goal) => {
        const merged = uniqueByCaseInsensitive([...get().customGoals, goal])
        set({ customGoals: merged.slice(0, 5) })
      },

      removeCustomGoal: (index) => {
        const { customGoals } = get()
        set({ customGoals: customGoals.filter((_, i) => i !== index) })
      },

      organizeGoals: () => {
        const { allGoals, derivedAreas, normalizedCustomGoals } = buildOrganizedData(
          get().selectedGoalChips,
          get().customGoals
        )

        set({
          customGoals: normalizedCustomGoals,
          organizedGoals: allGoals,
          derivedAreas,
        })
      },

      organizeAndPrepareGoals: () => {
        const { allGoals, derivedAreas, normalizedCustomGoals } = buildOrganizedData(
          get().selectedGoalChips,
          get().customGoals
        )

        set({
          customGoals: normalizedCustomGoals,
          organizedGoals: allGoals,
          derivedAreas,
          activeGoalIds: allGoals.map((goal) => goal.id),
          suggestedTasks: [],
          primaryTaskId: null,
          aiEnhanceStatus: 'idle',
        })
      },

      overrideGoalArea: (goalId, newArea) => {
        const { organizedGoals } = get()
        const updated = organizedGoals.map((goal) =>
          goal.id === goalId ? { ...goal, userOverriddenArea: newArea } : goal
        )

        const areaTypes = new Set<AreaType>()
        updated.forEach((goal) => {
          const effectiveArea = goal.userOverriddenArea || goal.areaType
          if (effectiveArea !== 'custom') areaTypes.add(effectiveArea)
        })

        const derivedAreas = AREA_PRESETS_EXTENDED.filter((area) =>
          areaTypes.has(area.type as AreaType)
        )

        set({ organizedGoals: updated, derivedAreas })
      },

      toggleActiveGoal: (goalId) => {
        const { activeGoalIds, suggestedTasks, primaryTaskId } = get()

        const nextActiveGoalIds = activeGoalIds.includes(goalId)
          ? activeGoalIds.filter((id) => id !== goalId)
          : [...activeGoalIds, goalId]

        const nextSuggestedTasks = suggestedTasks.filter((task) =>
          nextActiveGoalIds.includes(task.goalId)
        )

        set({
          activeGoalIds: nextActiveGoalIds,
          suggestedTasks: nextSuggestedTasks,
          primaryTaskId: resolvePrimaryTaskId(nextSuggestedTasks, primaryTaskId),
        })
      },

      setSuggestedTasks: (tasks) => {
        set((state) => ({
          suggestedTasks: tasks,
          primaryTaskId: resolvePrimaryTaskId(tasks, state.primaryTaskId),
        }))
      },

      toggleTaskAccepted: (goalId, taskName) => {
        const { suggestedTasks, primaryTaskId } = get()

        const updatedTasks = suggestedTasks.map((task) =>
          task.goalId === goalId && task.name === taskName
            ? { ...task, accepted: !task.accepted }
            : task
        )

        set({
          suggestedTasks: updatedTasks,
          primaryTaskId: resolvePrimaryTaskId(updatedTasks, primaryTaskId),
        })
      },

      setPrimaryTask: (taskKey) => {
        if (!taskKey) {
          set({ primaryTaskId: null })
          return
        }

        const hasTask = get().suggestedTasks.some(
          (task) => task.accepted && buildSuggestedTaskKey(task.goalId, task.name) === taskKey
        )

        if (hasTask) {
          set({ primaryTaskId: taskKey })
        }
      },

      setAiEnhanceStatus: (status) => set({ aiEnhanceStatus: status }),

      // V3 compatibility actions
      setGeneratedDirection: (direction) => set({ generatedDirection: direction }),
      setDirectionMode: (mode) => set({ directionMode: mode }),
      setEditedDirection: (direction) => set({ editedDirection: direction }),

      // ============================================
      // Navigation
      // ============================================
      setFlowVersion: (version) => {
        const currentState = get()
        const mappedStep =
          version === 'v4'
            ? (TO_V4_STEP[currentState.currentStep] ?? currentState.currentStep)
            : (TO_V3_STEP[currentState.currentStep] ?? currentState.currentStep)

        const nextCurrentStep = normalizeCurrentStep(mappedStep, version)

        set({
          flowVersion: version,
          currentStep: nextCurrentStep,
        })
      },

      markStarted: () => {
        if (!get().startedAt) {
          set({ startedAt: Date.now() })
        }
      },

      setNavigating: (value) => set({ isNavigating: value }),

      nextStep: () => {
        const { flowVersion, currentStep } = get()
        const stepOrder = getStepOrder(flowVersion)
        const currentIndex = stepOrder.indexOf(currentStep)

        if (currentIndex >= 0 && currentIndex < stepOrder.length - 1) {
          set({
            currentStep: stepOrder[currentIndex + 1],
            direction: 'forward',
          })
        }
      },

      prevStep: () => {
        const { flowVersion, currentStep } = get()
        const stepOrder = getStepOrder(flowVersion)
        const currentIndex = stepOrder.indexOf(currentStep)

        if (currentIndex > 0) {
          set({
            currentStep: stepOrder[currentIndex - 1],
            direction: 'backward',
          })
        }
      },

      reset: () => {
        set((state) => ({
          ...initialState,
          flowVersion: state.flowVersion,
        }))
      },
    }),
    {
      name: 'inu-onboarding',
      version: 7,
      migrate: (persistedState, version) => {
        if (version < 7) {
          return initialState
        }

        const state = (persistedState ?? {}) as Partial<OnboardingState>
        const flowVersion = state.flowVersion === 'v3' ? 'v3' : 'v4'

        return {
          ...initialState,
          ...state,
          flowVersion,
          currentStep: normalizeCurrentStep(state.currentStep, flowVersion),
          aiEnhanceStatus: state.aiEnhanceStatus ?? 'idle',
          primaryTaskId: state.primaryTaskId ?? null,
          startedAt: state.startedAt ?? null,
        } as OnboardingState
      },
      partialize: (state) => ({
        flowVersion: state.flowVersion,
        currentStep: state.currentStep,
        startedAt: state.startedAt,
        selectedGoalChips: state.selectedGoalChips,
        customGoals: state.customGoals,
        organizedGoals: state.organizedGoals,
        derivedAreas: state.derivedAreas,
        activeGoalIds: state.activeGoalIds,
        suggestedTasks: state.suggestedTasks,
        primaryTaskId: state.primaryTaskId,
        aiEnhanceStatus: state.aiEnhanceStatus,
        generatedDirection: state.generatedDirection,
        directionMode: state.directionMode,
        editedDirection: state.editedDirection,
      }),
    }
  )
)
