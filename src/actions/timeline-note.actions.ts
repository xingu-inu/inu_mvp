'use server'

import { z } from 'zod'
import { authAction } from '@/lib/security'
import { timelineNoteRepository } from '@/repositories'
import { successResponse } from '@/lib/api'
import type { ApiResponse } from '@/types'
import type { TimelineNote } from '@/repositories/timeline-note.repository'

const upsertSchema = z.object({
  observationKey: z.string().min(1).max(200),
  content: z.string().trim().min(1).max(500),
  eventContext: z.record(z.string(), z.unknown()).optional(),
})

export const getTimelineNotes = authAction(
  'getTimelineNotes',
  async ({ supabase, user }): Promise<ApiResponse<TimelineNote[]>> => {
    const notes = await timelineNoteRepository.getByUser(supabase, user.id)
    return successResponse(notes)
  }
)

export const upsertTimelineNote = authAction(
  'upsertTimelineNote',
  async (
    { supabase, user },
    input: z.infer<typeof upsertSchema>
  ): Promise<ApiResponse<TimelineNote>> => {
    const parsed = upsertSchema.parse(input)
    const note = await timelineNoteRepository.upsert(supabase, user.id, {
      observation_key: parsed.observationKey,
      content: parsed.content,
      event_context: parsed.eventContext,
    })
    return successResponse(note)
  }
)
