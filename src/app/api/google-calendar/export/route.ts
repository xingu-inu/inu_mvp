import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createGoogleEvent } from '@/lib/google-calendar'
import { TIME_SLOT_CONFIG } from '@/lib/constants/time-slots'
import type { HomeTask } from '@/actions/home.actions'
import type { TimeSlot } from '@/types/entities'

interface ExportResult {
  exported: number
  skipped: number
  failed: number
}

export async function POST(
  request: Request
): Promise<NextResponse<ExportResult | { error: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { date: string }
  const { date } = body

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  // Check Google Calendar connection
  const { data: connection } = await supabase
    .from('google_calendar_connections')
    .select('id, sync_enabled')
    .eq('user_id', user.id)
    .single()

  if (!connection?.sync_enabled) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
  }

  // Fetch user's tasks for the given date via RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawTasks, error: tasksError } = await (supabase.rpc as any)('get_today_tasks', {
    p_user_id: user.id,
    p_date: date,
  })

  if (tasksError || !rawTasks) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }

  const tasks = rawTasks as unknown as HomeTask[]
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

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

  return NextResponse.json({ exported, skipped, failed })
}
