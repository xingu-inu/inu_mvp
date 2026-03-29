'use server'

import { authAction } from '@/lib/security'
import { successResponse, errorResponse } from '@/lib/api'
import { ErrorCode } from '@/lib/api/errors'
import {
  createGoogleEvent,
  updateGoogleEvent,
  fetchGoogleEvents,
} from '@/lib/google-calendar/service'
import { buildGoogleEventFromTask } from '@/lib/google-calendar/event-builder'
import type { ApiResponse } from '@/types'
import type { GoogleCalendarConnection } from '@/types/google-calendar'
import type { Task } from '@/types/entities'

export type ExportScope = 'today' | 'week' | 'all'

export const getGoogleCalendarConnection = authAction(
  'getGoogleCalendarConnection',
  async ({ supabase }): Promise<ApiResponse<GoogleCalendarConnection | null>> => {
    const { data, error } = await supabase
      .from('google_calendar_connections')
      .select('id, user_id, calendar_id, sync_enabled, auto_sync, created_at, updated_at')
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

// Helper: check if a task should appear on a given date
function isTaskActiveOnDate(task: Task, dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = date.getDay() // 0=Sun, 1=Mon, ..., 6=Sat

  if (task.start_date && dateStr < task.start_date) return false
  if (task.end_date && dateStr > task.end_date) return false

  switch (task.repeat_type) {
    case 'daily':
      return true
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6
    case 'weekly':
    case 'custom':
      return task.repeat_days?.includes(dayOfWeek) ?? false
    case 'once':
      return task.scheduled_date === dateStr
    default:
      return true
  }
}

// Helper: get dates for a week starting from a given date (Monday-based)
function getWeekDates(dateStr: string): string[] {
  const date = new Date(dateStr + 'T00:00:00')
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday start
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

function filterTasksByScope(tasks: Task[], scope: ExportScope, date?: string): Task[] {
  if (scope === 'all') return tasks

  const targetDate = date || new Date().toISOString().slice(0, 10)

  if (scope === 'today') {
    return tasks.filter((t) => isTaskActiveOnDate(t, targetDate))
  }

  // week
  const weekDates = getWeekDates(targetDate)
  return tasks.filter((t) => weekDates.some((d) => isTaskActiveOnDate(t, d)))
}

// --- Preview ---

export interface ExportPreviewTask {
  id: string
  name: string
  areaEmoji: string | null
  areaColor: string | null
  isNew: boolean
}

export interface ExportPreviewResult {
  tasks: ExportPreviewTask[]
  newCount: number
  updateCount: number
}

export const getExportPreview = authAction(
  'getExportPreview',
  async (
    { supabase, user },
    scope: ExportScope,
    date?: string
  ): Promise<ApiResponse<ExportPreviewResult>> => {
    const { data: connection } = await supabase
      .from('google_calendar_connections')
      .select('sync_enabled')
      .eq('user_id', user.id)
      .single()

    if (!connection?.sync_enabled) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Google Calendar이 연결되지 않았습니다')
    }

    const { data: rawTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*, goals(areas(emoji, color))')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (tasksError || !rawTasks) {
      return errorResponse(ErrorCode.INTERNAL_ERROR, 'Task를 불러오는데 실패했습니다')
    }

    const allTasks = rawTasks as unknown as (Task & {
      goals: { areas: { emoji: string; color: string } } | null
    })[]
    const filtered = filterTasksByScope(allTasks as Task[], scope, date)

    const previewTasks: ExportPreviewTask[] = filtered.map((t) => {
      const taskWithGoal = allTasks.find((at) => at.id === t.id)
      return {
        id: t.id,
        name: t.name,
        areaEmoji: taskWithGoal?.goals?.areas?.emoji ?? null,
        areaColor: taskWithGoal?.goals?.areas?.color ?? null,
        isNew: !t.google_event_id,
      }
    })

    const newCount = previewTasks.filter((t) => t.isNew).length
    const updateCount = previewTasks.filter((t) => !t.isNew).length

    return successResponse({ tasks: previewTasks, newCount, updateCount })
  }
)

// --- Bulk Export ---

interface ExportResult {
  created: number
  updated: number
  failed: number
  failedTasks: Array<{ name: string; error: string }>
}

export const exportTasksToGoogleCalendar = authAction(
  'exportTasksToGoogleCalendar',
  async (
    { supabase, user },
    scope: ExportScope = 'all',
    date?: string
  ): Promise<ApiResponse<ExportResult>> => {
    const { data: connection } = await supabase
      .from('google_calendar_connections')
      .select('id, sync_enabled')
      .eq('user_id', user.id)
      .single()

    if (!connection?.sync_enabled) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Google Calendar이 연결되지 않았습니다')
    }

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (tasksError || !tasks) {
      return errorResponse(ErrorCode.INTERNAL_ERROR, 'Task를 불러오는데 실패했습니다')
    }

    const filtered = filterTasksByScope(tasks as Task[], scope, date)

    let created = 0
    let updated = 0
    let failed = 0
    const failedTasks: Array<{ name: string; error: string }> = []

    for (const task of filtered) {
      const event = buildGoogleEventFromTask(task)

      if (task.google_event_id) {
        const ok = await updateGoogleEvent(supabase, user.id, task.google_event_id, event)
        if (ok) {
          updated++
        } else {
          failed++
          failedTasks.push({ name: task.name, error: '업데이트 실패' })
        }
      } else {
        const eventId = await createGoogleEvent(supabase, user.id, event)
        if (eventId) {
          await supabase.from('tasks').update({ google_event_id: eventId }).eq('id', task.id)
          created++
        } else {
          failed++
          failedTasks.push({ name: task.name, error: '생성 실패' })
        }
      }
    }

    return successResponse({ created, updated, failed, failedTasks })
  }
)

interface SingleExportResult {
  success: boolean
  action: 'created' | 'updated'
  error?: string
}

export const exportSingleTaskToGoogleCalendar = authAction(
  'exportSingleTaskToGoogleCalendar',
  async ({ supabase, user }, taskId: string): Promise<ApiResponse<SingleExportResult>> => {
    const { data: connection } = await supabase
      .from('google_calendar_connections')
      .select('sync_enabled')
      .eq('user_id', user.id)
      .single()

    if (!connection?.sync_enabled) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Google Calendar이 연결되지 않았습니다')
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single()

    if (taskError || !task) {
      return errorResponse(ErrorCode.NOT_FOUND, 'Task를 찾을 수 없습니다')
    }

    const typedTask = task as Task
    const event = buildGoogleEventFromTask(typedTask)

    if (typedTask.google_event_id) {
      const ok = await updateGoogleEvent(supabase, user.id, typedTask.google_event_id, event)
      if (!ok) {
        return successResponse({ success: false, action: 'updated', error: '업데이트 실패' })
      }
      return successResponse({ success: true, action: 'updated' })
    }

    const eventId = await createGoogleEvent(supabase, user.id, event)
    if (!eventId) {
      return successResponse({ success: false, action: 'created', error: '생성 실패' })
    }

    await supabase.from('tasks').update({ google_event_id: eventId }).eq('id', taskId)
    return successResponse({ success: true, action: 'created' })
  }
)

export const toggleAutoSync = authAction(
  'toggleAutoSync',
  async ({ supabase, user }, enabled: boolean): Promise<ApiResponse<{ auto_sync: boolean }>> => {
    const { error } = await supabase
      .from('google_calendar_connections')
      .update({ auto_sync: enabled })
      .eq('user_id', user.id)

    if (error) {
      return errorResponse(ErrorCode.INTERNAL_ERROR)
    }

    return successResponse({ auto_sync: enabled })
  }
)

// --- Import ---

export interface ImportEventInput {
  id: string
  summary: string
  startTime: string | null
  dateStr: string
  isAllDay: boolean
  durationMinutes: number
}

export interface ImportResult {
  imported: number
  skipped: number
  failed: number
}

function inferTimeSlot(
  startTime: string | null,
  isAllDay: boolean
): 'dawn' | 'morning' | 'afternoon' | 'evening' | 'anytime' {
  if (isAllDay || !startTime) return 'anytime'
  const hour = parseInt(startTime.split(':')[0], 10)
  if (hour < 6) return 'dawn'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export const importGoogleEventsAsTasks = authAction(
  'importGoogleEventsAsTasks',
  async (
    { supabase, user },
    input: { events: ImportEventInput[] }
  ): Promise<ApiResponse<ImportResult>> => {
    const { data: connection } = await supabase
      .from('google_calendar_connections')
      .select('sync_enabled')
      .eq('user_id', user.id)
      .single()

    if (!connection?.sync_enabled) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Google Calendar이 연결되지 않았습니다')
    }

    if (input.events.length === 0) {
      return successResponse({ imported: 0, skipped: 0, failed: 0 })
    }

    // Check which google_event_ids already exist to avoid duplicates
    const eventIds = input.events.map((e) => e.id)
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('google_event_id')
      .eq('user_id', user.id)
      .in('google_event_id', eventIds)

    const existingEventIds = new Set(existingTasks?.map((t) => t.google_event_id) ?? [])

    let imported = 0
    let skipped = 0
    let failed = 0

    // Get last sort_order for appending
    const { data: lastTask } = await supabase
      .from('tasks')
      .select('sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: false, nullsFirst: false })
      .limit(1)
      .single()

    let lastSortOrder = lastTask?.sort_order ?? null

    for (const event of input.events) {
      if (existingEventIds.has(event.id)) {
        skipped++
        continue
      }

      try {
        // Generate next sort_order
        const { generateKeyBetween } = await import('fractional-indexing')
        const sortOrder = generateKeyBetween(lastSortOrder, null)

        const { error } = await supabase.from('tasks').insert({
          user_id: user.id,
          name: event.summary,
          repeat_type: 'once',
          scheduled_date: event.dateStr,
          time_slot: inferTimeSlot(event.startTime, event.isAllDay),
          specific_time: event.isAllDay ? null : event.startTime,
          duration_minutes: event.durationMinutes || 30,
          google_event_id: event.id,
          status: 'active',
          sort_order: sortOrder,
        })

        if (error) {
          failed++
        } else {
          lastSortOrder = sortOrder
          imported++
        }
      } catch {
        failed++
      }
    }

    return successResponse({ imported, skipped, failed })
  }
)

// --- Import Preview ---

export interface ImportPreviewEvent {
  id: string
  summary: string
  startTime: string | null
  dateStr: string
  isAllDay: boolean
  durationMinutes: number
  isInuEvent: boolean
  linkedTaskId: string | null
  linkedTaskName: string | null
}

export interface ImportPreviewResult {
  events: ImportPreviewEvent[]
  totalCount: number
  inuCount: number
  externalCount: number
}

function getImportTimeRange(
  scope: ExportScope,
  date?: string
): { timeMin: string; timeMax: string } {
  const targetDate = date || new Date().toISOString().slice(0, 10)

  if (scope === 'today') {
    return {
      timeMin: targetDate + 'T00:00:00',
      timeMax: targetDate + 'T23:59:59',
    }
  }

  if (scope === 'week') {
    const weekDates = getWeekDates(targetDate)
    return {
      timeMin: weekDates[0] + 'T00:00:00',
      timeMax: weekDates[6] + 'T23:59:59',
    }
  }

  // all: from today to 30 days ahead
  const start = new Date(targetDate + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 30)
  return {
    timeMin: start.toISOString().slice(0, 10) + 'T00:00:00',
    timeMax: end.toISOString().slice(0, 10) + 'T23:59:59',
  }
}

function formatTimeFromDateTime(dateTime: string): string {
  const d = new Date(dateTime)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const getImportPreview = authAction(
  'getImportPreview',
  async (
    { supabase, user },
    scope: ExportScope,
    date?: string
  ): Promise<ApiResponse<ImportPreviewResult>> => {
    const { data: connection } = await supabase
      .from('google_calendar_connections')
      .select('sync_enabled')
      .eq('user_id', user.id)
      .single()

    if (!connection?.sync_enabled) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Google Calendar이 연결되지 않았습니다')
    }

    const { timeMin, timeMax } = getImportTimeRange(scope, date)
    const rawEvents = await fetchGoogleEvents(supabase, user.id, timeMin, timeMax, {
      includeInuEvents: true,
    })

    // Build a map of google_event_id → task for [inu] events
    const { data: linkedTasks } = await supabase
      .from('tasks')
      .select('id, name, google_event_id')
      .eq('user_id', user.id)
      .not('google_event_id', 'is', null)

    const eventIdToTask = new Map<string, { id: string; name: string }>()
    if (linkedTasks) {
      for (const t of linkedTasks) {
        if (t.google_event_id) {
          eventIdToTask.set(t.google_event_id, { id: t.id, name: t.name })
        }
      }
    }

    const events: ImportPreviewEvent[] = rawEvents.map((e) => {
      const isInuEvent = e.summary.startsWith('[inu]')
      const linked = eventIdToTask.get(e.id)
      return {
        id: e.id,
        summary: e.summary,
        startTime: e.start.dateTime ? formatTimeFromDateTime(e.start.dateTime) : null,
        dateStr: e.dateStr,
        isAllDay: e.isAllDay,
        durationMinutes: e.durationMinutes,
        isInuEvent,
        linkedTaskId: linked?.id ?? null,
        linkedTaskName: linked?.name ?? null,
      }
    })

    const inuCount = events.filter((e) => e.isInuEvent).length
    const externalCount = events.length - inuCount

    return successResponse({ events, totalCount: events.length, inuCount, externalCount })
  }
)
