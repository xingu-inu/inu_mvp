'use server'

import { revalidatePath } from 'next/cache'

import { authAction } from '@/lib/security'

import type { Enums } from '@/types/database'
import type { Json } from '@/types/database'

type AreaType = Enums<'area_type'>

export interface DirectionInput {
  statement: string
  why?: string
}

export interface AreaInput {
  name: string
  type: AreaType
  emoji: string
  color: string
  sortOrder: string
}

export interface GoalInput {
  name: string
  why?: string
}

export interface TaskInput {
  name: string
}

export interface OnboardingResult {
  directionId: string
  firstAreaId: string
  firstGoalId: string | null
}

/**
 * Complete the onboarding process in a single transaction
 * @param direction - Life direction statement
 * @param areas - Selected life areas
 * @param firstGoal - Optional first goal
 * @param firstTask - Optional first task
 */
export const completeOnboarding = authAction(
  'completeOnboarding',
  async (
    { supabase, user },
    direction: DirectionInput,
    areas: AreaInput[],
    firstGoal?: GoalInput,
    firstTask?: TaskInput
  ): Promise<OnboardingResult> => {
    const { data, error } = await supabase.rpc('complete_onboarding', {
      p_user_id: user.id,
      p_direction: direction as unknown as Json,
      p_areas: areas as unknown as Json,
      p_first_goal: (firstGoal || null) as unknown as Json,
      p_first_task: (firstTask || null) as unknown as Json,
    })

    if (error) throw error

    revalidatePath('/')

    return data as unknown as OnboardingResult
  }
)

/**
 * Check if user has completed onboarding
 */
export const checkOnboardingStatus = authAction(
  'checkOnboardingStatus',
  async ({ supabase, user }): Promise<boolean> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    if (error) return false

    return data?.onboarding_completed ?? false
  }
)
