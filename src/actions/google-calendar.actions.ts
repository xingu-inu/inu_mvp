'use server'

import { authAction } from '@/lib/security'
import { successResponse, errorResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import type { ApiResponse } from '@/types'
import type { GoogleCalendarConnection } from '@/types/google-calendar'

export const getGoogleCalendarConnection = authAction(
  'getGoogleCalendarConnection',
  async ({ supabase }): Promise<ApiResponse<GoogleCalendarConnection | null>> => {
    const { data, error } = await supabase
      .from('google_calendar_connections')
      .select('id, user_id, calendar_id, sync_enabled, created_at, updated_at')
      .single()

    if (error && error.code !== 'PGRST116') {
      return errorResponse(ErrorCode.INTERNAL_ERROR)
    }

    return successResponse(data ?? null)
  }
)

export const toggleGoogleCalendarSync = authAction(
  'toggleGoogleCalendarSync',
  async ({ supabase, user }, enabled: boolean): Promise<ApiResponse<{ sync_enabled: boolean }>> => {
    const { error } = await supabase
      .from('google_calendar_connections')
      .update({ sync_enabled: enabled })
      .eq('user_id', user.id)

    if (error) {
      return errorResponse(ErrorCode.INTERNAL_ERROR)
    }

    return successResponse({ sync_enabled: enabled })
  }
)
