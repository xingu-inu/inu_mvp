// Hidden Timeline Events Repository
// Soft-delete (hide) timeline items

import type { TypedSupabaseClient } from './base.repository'
import { handleSupabaseError } from './base.repository'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFrom = any

export const hiddenTimelineRepository = {
  async getByUser(supabase: TypedSupabaseClient, userId: string): Promise<Set<string>> {
    const { data, error } = await (supabase.from as AnyFrom)('hidden_timeline_events')
      .select('event_id')
      .eq('user_id', userId)

    if (error) handleSupabaseError(error)
    return new Set((data ?? []).map((row: { event_id: string }) => row.event_id))
  },

  async hide(
    supabase: TypedSupabaseClient,
    userId: string,
    eventId: string,
    eventType: string
  ): Promise<void> {
    const { error } = await (supabase.from as AnyFrom)('hidden_timeline_events').upsert(
      {
        user_id: userId,
        event_id: eventId,
        event_type: eventType,
        hidden_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,event_id' }
    )

    if (error) handleSupabaseError(error)
  },

  async unhide(supabase: TypedSupabaseClient, userId: string, eventId: string): Promise<void> {
    const { error } = await (supabase.from as AnyFrom)('hidden_timeline_events')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId)

    if (error) handleSupabaseError(error)
  },
}
