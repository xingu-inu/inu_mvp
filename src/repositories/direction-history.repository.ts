// Direction History Repository
// 방향 변경 히스토리 관리

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'
import type { Tables } from '@/types/database'

export type DirectionHistoryRow = Tables<'direction_history'>

export const directionHistoryRepository = {
  async insert(
    supabase: TypedSupabaseClient,
    userId: string,
    directionId: string,
    changeType: string,
    fieldChanged?: string | null,
    oldValue?: string | null,
    newValue?: string | null,
    note?: string | null
  ): Promise<DirectionHistoryRow> {
    const { data, error } = await supabase
      .from('direction_history')
      .insert({
        direction_id: directionId,
        user_id: userId,
        change_type: changeType,
        field_changed: fieldChanged ?? null,
        old_value: oldValue ?? null,
        new_value: newValue ?? null,
        note: note ?? null,
      })
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as unknown as DirectionHistoryRow
  },

  async getAllHistory(
    supabase: TypedSupabaseClient,
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<DirectionHistoryRow[]> {
    let query = supabase
      .from('direction_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    const { data, error } = await query
    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as DirectionHistoryRow[]
  },
}
