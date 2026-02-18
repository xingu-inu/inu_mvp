// Profile Repository
// Phase 4.5: API Design & Server Actions

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError, isNotFoundError, now } from './base.repository'
import type { Profile, UpdateProfileInput } from '@/types/entities'

export const profileRepository = {
  /**
   * 프로필 조회
   */
  async get(supabase: TypedSupabaseClient, userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

    if (error) {
      if (isNotFoundError(error)) return null
      handleSupabaseError(error)
    }

    return data as Profile
  },

  /**
   * 프로필 수정
   */
  async update(
    supabase: TypedSupabaseClient,
    userId: string,
    input: UpdateProfileInput
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...input,
        updated_at: now(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as Profile
  },

  /**
   * 아바타 URL 업데이트
   */
  async updateAvatar(
    supabase: TypedSupabaseClient,
    userId: string,
    avatarUrl: string
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        updated_at: now(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as Profile
  },

  /**
   * 온보딩 완료 처리
   */
  async completeOnboarding(supabase: TypedSupabaseClient, userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        updated_at: now(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as Profile
  },

  /**
   * 온보딩 완료 여부 확인
   */
  async isOnboardingCompleted(supabase: TypedSupabaseClient, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .single()

    if (error) {
      if (isNotFoundError(error)) return false
      handleSupabaseError(error)
    }

    return data?.onboarding_completed ?? false
  },
}
