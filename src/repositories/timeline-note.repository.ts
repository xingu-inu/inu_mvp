// Timeline Note Repository
// User reflection notes on AI observations

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'

export interface TimelineNote {
  id: string
  user_id: string
  observation_key: string
  content: string
  event_context: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface UpsertTimelineNoteInput {
  observation_key: string
  content: string
  event_context?: Record<string, unknown>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFrom = any

export const timelineNoteRepository = {
  async getByUser(supabase: TypedSupabaseClient, userId: string): Promise<TimelineNote[]> {
    const { data, error } = await (supabase.from as AnyFrom)('timeline_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) handleSupabaseError(error)
    return (data ?? []) as unknown as TimelineNote[]
  },

  async upsert(
    supabase: TypedSupabaseClient,
    userId: string,
    input: UpsertTimelineNoteInput
  ): Promise<TimelineNote> {
    const { data, error } = await (supabase.from as AnyFrom)('timeline_notes')
      .upsert(
        {
          user_id: userId,
          observation_key: input.observation_key,
          content: input.content,
          event_context: input.event_context ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,observation_key' }
      )
      .select()
      .single()

    if (error) handleSupabaseError(error)
    return data as unknown as TimelineNote
  },
}
