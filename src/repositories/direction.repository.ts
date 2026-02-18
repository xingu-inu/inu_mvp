// Direction Repository

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError, isNotFoundError, now } from './base.repository'
import type { Direction, CreateDirectionInput, UpdateDirectionInput } from '@/types/entities'

export const directionRepository = {
  /**
   * 현재 활성 Direction 조회
   */
  async get(supabase: TypedSupabaseClient, userId: string): Promise<Direction | null> {
    const { data, error } = await supabase
      .from('directions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error) {
      if (isNotFoundError(error)) {
        return null
      }
      handleSupabaseError(error)
    }

    return data as Direction
  },

  /**
   * 모든 Direction 버전 조회 (히스토리)
   */
  async getAll(supabase: TypedSupabaseClient, userId: string): Promise<Direction[]> {
    const { data, error } = await supabase
      .from('directions')
      .select('*')
      .eq('user_id', userId)
      .order('version', { ascending: false })

    if (error) handleSupabaseError(error)
    return (data ?? []) as Direction[]
  },

  /**
   * 특정 Direction 조회
   */
  async getById(
    supabase: TypedSupabaseClient,
    id: string,
    userId: string
  ): Promise<Direction | null> {
    const { data, error } = await supabase
      .from('directions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (isNotFoundError(error)) return null
      handleSupabaseError(error)
    }

    return data as Direction
  },

  /**
   * Direction 생성
   */
  async create(
    supabase: TypedSupabaseClient,
    userId: string,
    input: CreateDirectionInput
  ): Promise<Direction> {
    const { data, error } = await supabase
      .from('directions')
      .insert({
        user_id: userId,
        statement: input.statement,
        why: input.why ?? null,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as Direction
  },

  /**
   * Direction 수정
   */
  async update(
    supabase: TypedSupabaseClient,
    id: string,
    userId: string,
    input: UpdateDirectionInput
  ): Promise<Direction> {
    const { data, error } = await supabase
      .from('directions')
      .update({
        ...input,
        updated_at: now(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as Direction
  },
}
