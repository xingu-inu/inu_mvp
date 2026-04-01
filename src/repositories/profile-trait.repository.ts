// Profile Trait Repository
// Free-form key-value profile data

import { generateKeyBetween } from 'fractional-indexing'
import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError, now, isValidFractionalKey, batchReorder } from './base.repository'
import type {
  ProfileTrait,
  CreateProfileTraitInput,
  UpdateProfileTraitInput,
} from '@/types/entities'

export const profileTraitRepository = {
  /**
   * 사용자의 모든 프로필 항목 조회
   */
  async getByUser(supabase: TypedSupabaseClient, userId: string): Promise<ProfileTrait[]> {
    const { data, error } = await supabase
      .from('profile_traits')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) handleSupabaseError(error)
    return (data ?? []) as ProfileTrait[]
  },

  /**
   * 프로필 항목 생성
   */
  async create(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateProfileTraitInput
  ): Promise<ProfileTrait> {
    // 마지막 sort_order 조회
    const { data: lastTrait } = await supabase
      .from('profile_traits')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const lastKey =
      lastTrait?.sort_order && isValidFractionalKey(lastTrait.sort_order)
        ? lastTrait.sort_order
        : null
    const newSortOrder = generateKeyBetween(lastKey, null)

    const { data, error } = await supabase
      .from('profile_traits')
      .insert({
        user_id: userId,
        label: input.label,
        value: input.value,
        category: input.category ?? 'general',
        sort_order: newSortOrder,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as ProfileTrait
  },

  /**
   * 프로필 항목 수정
   */
  async update(
    supabase: TypedSupabaseClient,
    id: string,
    input: UpdateProfileTraitInput
  ): Promise<ProfileTrait> {
    const { data, error } = await supabase
      .from('profile_traits')
      .update({
        ...input,
        updated_at: now(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as ProfileTrait
  },

  /**
   * 프로필 항목 삭제
   */
  async delete(supabase: TypedSupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('profile_traits').delete().eq('id', id)

    if (error) handleSupabaseError(error)
  },

  /**
   * 프로필 항목 순서 변경
   */
  async reorder(supabase: TypedSupabaseClient, orderedIds: string[]): Promise<void> {
    await batchReorder(supabase, 'profile_traits', orderedIds)
  },
}
