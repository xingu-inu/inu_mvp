'use server'

import { z } from 'zod'
import { authAction } from '@/lib/security'
import { successResponse, errorResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import { createGoogleEvent } from '@/lib/google-calendar'
import { TIME_SLOT_CONFIG } from '@/lib/constants/time-slots'
import type { ApiResponse } from '@/types'
import type { GoogleCalendarConnection } from '@/types/google-calendar'
import type { HomeTask } from '@/actions/home.actions'
import type { TimeSlot } from '@/types/entities'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다')

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

export const disconnectGoogleCalendar = authAction(
  'disconnectGoogleCalendar',
  async ({ supabase, user }): Promise<ApiResponse<{ success: boolean }>> => {
    await supabase.from('google_calendar_connections').delete().eq('user_id', user.id)
    await supabase.from('tasks').update({ google_event_id: null }).eq('user_id', user.id)
    return successResponse({ success: true })
  }
)

interface ExportResult {
  exported: number
  skipped: number
  failed: number
}

export const exportTasksToGoogleCalendar = authAction(
  'exportTasksToGoogleCalendar',
  async ({ supabase, user }, date: string): Promise<ApiResponse<ExportResult>> => {
    const parsed = dateSchema.safeParse(date)
    if (!parsed.success) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, '날짜 형식이 올바르지 않습니다')
    }

    // Check Google Calendar connection
    const { data: connection } = await supabase
      .from('google_calendar_connections')
      .select('id, sync_enabled')
      .eq('user_id', user.id)
      .single()

    if (!connection?.sync_enabled) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Google Calendar이 연결되지 않았습니다')
    }

    // Fetch user's tasks for the given date via RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawTasks, error: tasksError } = await (supabase.rpc as any)('get_today_tasks', {
      p_user_id: user.id,
      p_date: date,
    })

    if (tasksError || !rawTasks) {
      return errorResponse(ErrorCode.INTERNAL_ERROR, 'Task를 불러오는데 실패했습니다')
    }

    const tasks = rawTasks as unknown as HomeTask[]
    const timeZone = 'Asia/Seoul'

    let exported = 0
    let skipped = 0
    let failed = 0

    for (const task of tasks) {
      // Skip already-done tasks
      if (task.todayCheckIn?.status === 'done' || task.todayCheckIn?.status === 'skip') {
        skipped++
        continue
      }

      const summary = `[inu] ${task.name}`
      const description = task.why || undefined

      let startDateTime: string
      let endDateTime: string

      if (task.specificTime) {
        startDateTime = `${date}T${task.specificTime}:00`
        const durationMs = (task.durationMinutes || 30) * 60_000
        endDateTime = new Date(new Date(startDateTime).getTime() + durationMs)
          .toISOString()
          .slice(0, 19)
      } else if (task.timeSlot && task.timeSlot !== 'anytime') {
        const config = TIME_SLOT_CONFIG[task.timeSlot as TimeSlot]
        if (config) {
          const midHour = Math.floor((config.hours[0] + config.hours[1]) / 2)
          startDateTime = `${date}T${String(midHour).padStart(2, '0')}:00:00`
          const durationMs = (task.durationMinutes || 30) * 60_000
          endDateTime = new Date(new Date(startDateTime).getTime() + durationMs)
            .toISOString()
            .slice(0, 19)
        } else {
          skipped++
          continue
        }
      } else {
        startDateTime = `${date}T09:00:00`
        const durationMs = (task.durationMinutes || 30) * 60_000
        endDateTime = new Date(new Date(startDateTime).getTime() + durationMs)
          .toISOString()
          .slice(0, 19)
      }

      const eventId = await createGoogleEvent(supabase, user.id, {
        summary,
        description,
        start: { dateTime: startDateTime, timeZone },
        end: { dateTime: endDateTime, timeZone },
      })

      if (eventId) {
        exported++
      } else {
        failed++
      }
    }

    return successResponse({ exported, skipped, failed })
  }
)
