import { beforeEach, describe, expect, it } from 'vitest'

import { buildSuggestedTaskKey, useOnboardingStore } from '../onboarding.store'

describe('onboarding.store', () => {
  beforeEach(() => {
    localStorage.removeItem('inu-onboarding')
    useOnboardingStore.getState().reset()
  })

  it('starts with v4 welcome step', () => {
    const state = useOnboardingStore.getState()
    expect(state.flowVersion).toBe('v4')
    expect(state.currentStep).toBe('welcome')
  })

  it('switches step order by flow version', () => {
    useOnboardingStore.getState().setFlowVersion('v3')
    useOnboardingStore.getState().nextStep()
    expect(useOnboardingStore.getState().currentStep).toBe('brain-dump')

    useOnboardingStore.getState().setFlowVersion('v4')
    expect(useOnboardingStore.getState().currentStep).toBe('goal-capture')
  })

  it('organizes goals and prepares active ids', () => {
    const store = useOnboardingStore.getState()
    store.toggleGoalChip('exercise-daily')
    store.mergeCustomGoals(['영어 공부', '영어 공부'])
    store.organizeAndPrepareGoals()

    const state = useOnboardingStore.getState()
    expect(state.organizedGoals.length).toBe(2)
    expect(state.activeGoalIds.length).toBe(2)
    expect(state.customGoals.length).toBe(1)
  })

  it('auto-assigns primary task and clears it when task is unchecked', () => {
    const store = useOnboardingStore.getState()
    store.setSuggestedTasks([
      { goalId: 'g1', name: '첫 실천', accepted: true },
      { goalId: 'g1', name: '두번째 실천', accepted: true },
    ])

    const firstKey = buildSuggestedTaskKey('g1', '첫 실천')
    expect(useOnboardingStore.getState().primaryTaskId).toBe(firstKey)

    store.toggleTaskAccepted('g1', '첫 실천')
    const secondKey = buildSuggestedTaskKey('g1', '두번째 실천')
    expect(useOnboardingStore.getState().primaryTaskId).toBe(secondKey)
  })

  it('migrates v6 data to initial v7 state', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const migrate = (useOnboardingStore as any).persist.getOptions().migrate as (
      state: unknown,
      version: number
    ) => unknown

    const migrated = migrate({ currentStep: 'life-organized' }, 6) as { currentStep: string }
    expect(migrated.currentStep).toBe('welcome')
  })
})
