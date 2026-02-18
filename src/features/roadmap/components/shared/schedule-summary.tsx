import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { RepeatType, TimeSlot } from '@/types/entities'
import { getRepeatLabel } from '@/lib/utils/repeat-utils'
import { TIME_SLOT_CONFIG, DURATION_OPTIONS } from '@/lib/constants/time-slots'

interface ScheduleSummaryProps {
  repeatType: RepeatType
  repeatDays?: number[] | null
  scheduledDate?: string | null
  timeSlot?: TimeSlot
  specificTime?: string | null
  durationMinutes?: number
  startDate?: string | null
  endDate?: string | null
}

function formatDuration(minutes: number): string {
  const match = DURATION_OPTIONS.find((opt) => opt.value === minutes)
  if (match) return match.label
  if (minutes < 60) return `${minutes}분`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`
}

function formatTimeSlot(timeSlot: TimeSlot, specificTime: string | null | undefined): string {
  if (specificTime) {
    const config = TIME_SLOT_CONFIG[timeSlot]
    const emoji = config?.emoji ?? '⏰'
    return `${emoji} ${specificTime}`
  }
  const config = TIME_SLOT_CONFIG[timeSlot]
  if (!config) return '⏰ 자유'
  return `${config.emoji} ${config.label}`
}

function formatDateShort(dateStr: string): string {
  const date = parseISO(dateStr)
  return format(date, 'M월 d일 (EEE)', { locale: ko })
}

function formatDateCompact(dateStr: string): string {
  const date = parseISO(dateStr)
  return format(date, 'M/d', { locale: ko })
}

export function ScheduleSummary({
  repeatType,
  repeatDays,
  scheduledDate,
  timeSlot,
  specificTime,
  durationMinutes,
  startDate,
  endDate,
}: ScheduleSummaryProps) {
  const parts: string[] = []
  const isOnce = repeatType === 'once'

  // 1. Mode prefix + pattern/date
  if (isOnce) {
    parts.push('1회')
    if (scheduledDate) {
      parts.push(`📅 ${formatDateShort(scheduledDate)}`)
    }
  } else {
    parts.push('반복')
    const repeatLabel = getRepeatLabel(repeatType, repeatDays ?? null)
    if (repeatType === 'custom' || repeatType === 'weekly') {
      parts.push(`매주 ${repeatLabel}`)
    } else {
      parts.push(repeatLabel)
    }
  }

  // 2. Time slot part
  if (timeSlot) {
    parts.push(formatTimeSlot(timeSlot, specificTime))
  }

  // 3. Duration part
  if (durationMinutes && durationMinutes > 0) {
    parts.push(formatDuration(durationMinutes))
  }

  // 4. Period part (for repeating tasks with start/end dates)
  if (!isOnce && (startDate || endDate)) {
    const start = startDate ? formatDateCompact(startDate) : ''
    const end = endDate ? formatDateCompact(endDate) : ''
    if (start && end) {
      parts.push(`${start} ~ ${end}`)
    } else if (start) {
      parts.push(`${start} ~`)
    } else if (end) {
      parts.push(`~ ${end}`)
    }
  }

  // Join main parts with " · " and period with " | "
  const mainParts = !isOnce && (startDate || endDate) ? parts.slice(0, -1) : parts
  const periodPart = !isOnce && (startDate || endDate) ? parts[parts.length - 1] : null

  const summary = periodPart ? `${mainParts.join(' · ')} | ${periodPart}` : mainParts.join(' · ')

  return <span className="text-xs text-[var(--color-text-tertiary)]">{summary}</span>
}
