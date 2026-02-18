// Area Repository
// Phase 4.5: API Design & Server Actions

import type { TypedSupabaseClient } from './base.repository'
import {
  handleSupabaseError,
  isNotFoundError,
  now,
  getActiveDirectionId,
  batchReorder,
  isValidFractionalKey,
} from './base.repository'
import { generateKeyBetween } from 'fractional-indexing'
import type { Area, CreateAreaInput, UpdateAreaInput } from '@/types/entities'

export const areaRepository = {
  /**
   * 사용자의 모든 Area 조회
   */
  async getAll(supabase: TypedSupabaseClient, userId: string): Promise<Area[]> {
    const directionId = await getActiveDirectionId(supabase, userId)

    const query = supabase
      .from('areas')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (directionId) {
      query.eq('direction_id', directionId)
    }

    const { data, error } = await query

    if (error) handleSupabaseError(error)
    return (data ?? []) as Area[]
  },

  /**
   * 활성화된 Area만 조회 (현재 로드맵 버전 기준)
   */
  async getActive(supabase: TypedSupabaseClient, userId: string): Promise<Area[]> {
    const directionId = await getActiveDirectionId(supabase, userId)

    const query = supabase
      .from('areas')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (directionId) {
      query.eq('direction_id', directionId)
    }

    const { data, error } = await query

    if (error) handleSupabaseError(error)
    return (data ?? []) as Area[]
  },

  /**
   * ID로 Area 조회
   */
  async getById(supabase: TypedSupabaseClient, id: string, userId: string): Promise<Area | null> {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (isNotFoundError(error)) return null
      handleSupabaseError(error)
    }

    return data as Area
  },

  /**
   * Area 생성
   */
  async create(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateAreaInput,
    directionId: string
  ): Promise<Area> {
    // 마지막 sort_order 조회
    const { data: lastArea } = await supabase
      .from('areas')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const lastKey =
      lastArea?.sort_order && isValidFractionalKey(lastArea.sort_order) ? lastArea.sort_order : null
    const newSortOrder = generateKeyBetween(lastKey, null)

    const { data, error } = await supabase
      .from('areas')
      .insert({
        user_id: userId,
        direction_id: directionId,
        name: input.name,
        type: input.type ?? 'custom',
        emoji: input.emoji,
        color: input.color,
        why: input.why ?? null,
        sort_order: newSortOrder,
        is_active: true,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as Area
  },

  /**
   * Area 수정
   */
  async update(
    supabase: TypedSupabaseClient,
    id: string,
    userId: string,
    input: UpdateAreaInput
  ): Promise<Area> {
    const { data, error } = await supabase
      .from('areas')
      .update({
        ...input,
        updated_at: now(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as Area
  },

  /**
   * Area 삭제
   */
  async delete(supabase: TypedSupabaseClient, id: string, userId: string): Promise<void> {
    const { error } = await supabase.from('areas').delete().eq('id', id).eq('user_id', userId)

    if (error) handleSupabaseError(error)
  },

  /**
   * Area 순서 변경 (배치)
   */
  async reorder(
    supabase: TypedSupabaseClient,
    userId: string,
    orderedIds: string[]
  ): Promise<void> {
    await batchReorder(supabase, 'areas', orderedIds)
  },
}
