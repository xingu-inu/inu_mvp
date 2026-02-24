import type { RepeatType, TimeSlot } from '@/types/entities'
import type { GoogleEventInput } from './service'
import { buildRecurrence } from './rrule'
import { TIME_SLOT_CONFIG } from '@/lib/constants/time-slots'

interface EventTaskInput {
  name: string
  why: string | null
  specific_time: string | null // "HH:MM"
  time_slot: TimeSlot | null
  duration_minutes: number | null
  repeat_type: RepeatType
  repeat_days: number[] | null
  start_date: string | null // "YYYY-MM-DD"
  end_date: string | null // "YYYY-MM-DD"
  scheduled_date: string | null // "YYYY-MM-DD" (once tasks)
}

/** Compute end time string from start time + duration, detecting midnight crossover */
function computeEndTime(
  startTime: string,
  durationMinutes: number
): { time: string; crossesMidnight: boolean } {
  const [h, m] = startTime.split(':').map(Number)
  const total = (h || 0) * 60 + (m || 0) + durationMinutes
  const crossesMidnight = total >= 1440
  const endH = Math.floor(total / 60) % 24
  const endM = total % 60
  return {
    time: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
    crossesMidnight,
  }
}

/** Add one day to a YYYY-MM-DD string */
function nextDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

const TIME_ZONE = 'Asia/Seoul'

/**
 * Build a GoogleEventInput from task data.
 * Handles timed events, all-day events, and recurrence.
 */
export function buildGoogleEventFromTask(task: EventTaskInput): GoogleEventInput {
  const summary = `[inu] ${task.name}`
  const description = task.why || undefined
  const duration = task.duration_minutes || 30

  // Determine the base date for the event
  const baseDate =
    task.repeat_type === 'once'
      ? task.scheduled_date || new Date().toISOString().slice(0, 10)
      : task.start_date || new Date().toISOString().slice(0, 10)

  // Build recurrence rules
  const recurrence = buildRecurrence({
    repeat_type: task.repeat_type,
    repeat_days: task.repeat_days,
    end_date: task.end_date,
  })

  // Determine time → timed event or all-day event
  if (task.specific_time) {
    // Exact time specified
    const startTime = task.specific_time
    const endTime = computeEndTime(startTime, duration)
    return {
      summary,
      description,
      start: { dateTime: `${baseDate}T${startTime}:00`, timeZone: TIME_ZONE },
      end: { dateTime: `${baseDate}T${endTime}:00`, timeZone: TIME_ZONE },
      recurrence,
    }
  }

  if (task.time_slot && task.time_slot !== 'anytime') {
    // Time slot → use midpoint
    const config = TIME_SLOT_CONFIG[task.time_slot]
    const midHour = Math.floor((config.hours[0] + config.hours[1]) / 2)
    const startTime = `${String(midHour).padStart(2, '0')}:00`
    const endTime = computeEndTime(startTime, duration)
    return {
      summary,
      description,
      start: { dateTime: `${baseDate}T${startTime}:00`, timeZone: TIME_ZONE },
      end: { dateTime: `${baseDate}T${endTime}:00`, timeZone: TIME_ZONE },
      recurrence,
    }
  }

  // Anytime or no time info → all-day event
  return {
    summary,
    description,
    start: { date: baseDate },
    end: { date: nextDay(baseDate) },
    recurrence,
