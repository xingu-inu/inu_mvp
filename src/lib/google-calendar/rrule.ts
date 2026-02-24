import type { RepeatType } from '@/types/entities'

/** RFC 5545 BYDAY codes indexed by JS getDay() (0=Sun) */
const DAY_CODE: Record<number, string> = {
  0: 'SU',
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
}

interface RecurrenceInput {
  repeat_type: RepeatType
  repeat_days: number[] | null
  end_date: string | null // 'YYYY-MM-DD'
  isAllDay?: boolean
}

/**
 * Build Google Calendar `recurrence` array from task repeat config.
 * Returns undefined for non-recurring (once) tasks.
 *
 * @see https://developers.google.com/calendar/api/v3/reference/events#recurrence
 * @see https://datatracker.ietf.org/doc/html/rfc5545#section-3.8.5.3
 */
export function buildRecurrence(input: RecurrenceInput): string[] | undefined {
  const { repeat_type, repeat_days, end_date } = input

  let rule: string | undefined

  switch (repeat_type) {
    case 'once':
      return undefined

    case 'daily':
      rule = 'RRULE:FREQ=DAILY'
      break

    case 'weekdays':
      rule = 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
      break

    case 'weekends':
      rule = 'RRULE:FREQ=WEEKLY;BYDAY=SA,SU'
      break

    case 'weekly':
    case 'custom': {
      if (!repeat_days || repeat_days.length === 0) {
        return undefined
      }
      const byDay = repeat_days
        .slice()
        .sort((a, b) => a - b)
        .map((d) => DAY_CODE[d])
        .filter(Boolean)
        .join(',')
      rule = `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`
      break
    }

    default:
      return undefined
  }

  // Append UNTIL if end_date is set
  // RFC 5545: DATE start → UNTIL must be DATE; DATETIME start → UNTIL must be DATETIME
  if (end_date) {
    if (input.isAllDay) {
      // All-day events: UNTIL as DATE value (YYYYMMDD)
      const untilStr = end_date.replace(/-/g, '')
      rule += `;UNTIL=${untilStr}`
    } else {
      // Timed events: UNTIL as UTC datetime. Convert end_date 23:59 KST → 14:59 UTC
      const untilStr = end_date.replace(/-/g, '') + 'T145900Z'
      rule += `;UNTIL=${untilStr}`
    }
  }

  return [rule]
}
