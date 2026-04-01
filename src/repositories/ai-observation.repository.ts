// AI Observation Repository
// DB-persisted cache for timeline AI observations

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'

export interface AiObservationRow {
  id: string
  user_id: string
  nodes: unknown // ObservationNode[] as JSONB
  generated_at: string
  data_hash: string | null
  created_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFrom = any

export const aiObservationRepository = {
  async getByUser(supabase: TypedSupabaseClient, userId: string): Promise<AiObservationRow | null> {
    const { data, error } = await (supabase.from as AnyFrom)('ai_observations')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) handleSupabaseError(error)
    return (data as unknown as AiObservationRow) ?? null
  },

  async upsert(
    supabase: TypedSupabaseClient,
    userId: string,
    nodes: unknown,
    dataHash: string
  ): Promise<AiObservationRow> {
    const { data, error } = await (supabase.from as AnyFrom)('ai_observations')
      .upsert(
        {
          user_id: userId,
          nodes,
          generated_at: new Date().toISOString(),
          data_hash: dataHash,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as unknown as AiObservationRow
  },
}
