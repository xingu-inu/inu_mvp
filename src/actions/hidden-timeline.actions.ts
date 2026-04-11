'use server'

import { z } from 'zod'
import { authAction } from '@/lib/security'
import { hiddenTimelineRepository } from '@/repositories'
import { successResponse } from '@/lib/api'
import type { ApiResponse } from '@/types'

const hideSchema = z.object({
  eventId: z.string().min(1).max(300),
  eventType: z.enum([
    'goal_status',
    'task_status',
    'profile_trait',
    'direction_change',
    'entity_activity',
    'ai_observation',
  ]),
})

export const hideTimelineEvent = authAction(
  'hideTimelineEvent',
  async ({ supabase, user }, input: z.infer<typeof hideSchema>): Promise<ApiResponse<null>> => {
    const parsed = hideSchema.parse(input)
    await hiddenTimelineRepository.hide(supabase, user.id, parsed.eventId, parsed.eventType)
    return successResponse(null)
  }
)
