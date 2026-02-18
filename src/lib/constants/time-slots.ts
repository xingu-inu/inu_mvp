import type { RepeatType, TimeSlot } from '@/types/entities'

/**
 * Time slot configuration with labels, emojis, and hour ranges
 * 24시간 빈틈없이 커버: 새벽(0-6) → 오전(6-12) → 오후(12-18) → 저녁(18-24)
 */
export const TIME_SLOT_CONFIG: Record<
  TimeSlot,
  { label: string; emoji: string; hours: [number, number] }
> = {
  dawn: { label: '새벽', emoji: '🌃', hours: [0, 6] },
  morning: { label: '오전', emoji: '☀️', hours: [6, 12] },
  afternoon: { label: '오후', emoji: '🌞', hours: [12, 18] },
  evening: { label: '저녁', emoji: '🌙', hours: [18, 24] },
  anytime: { label: '언제든', emoji: '⏰', hours: [0, 24] },
}

/**
 * Ordered list of time slots for display
 */
export const TIME_SLOT_ORDER: TimeSlot[] = ['dawn', 'morning', 'afternoon', 'evening', 'anytime']

/**
 * Hourly grid constants (Google Calendar style)
 */
export const HOUR_HEIGHT = 56 // pixels per hour row
export const GUTTER_WIDTH = 64 // pixels for time gutter column
export const TOTAL_GRID_HEIGHT = HOUR_HEIGHT * 24 // 1344px

export const HOUR_LABELS = [
  '00:00',
  '01:00',
  '02:00',
  '03:00',
  '04:00',
  '05:00',
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
] as const

/**
 * Duration options for task creation (in minutes)
 */
export const DURATION_OPTIONS = [
  { value: 5, label: '5분' },
  { value: 10, label: '10분' },
  { value: 15, label: '15분' },
  { value: 30, label: '30분' },
  { value: 45, label: '45분' },
  { value: 60, label: '1시간' },
  { value: 90, label: '1시간 30분' },
  { value: 120, label: '2시간' },
] as const

/**
 * Repeat options for quick inline task creation (home screen)
 */
export const QUICK_REPEAT_OPTIONS: Array<{ value: RepeatType; label: string }> = [
  { value: 'once', label: '오늘만' },
  { value: 'daily', label: '매일' },
  { value: 'weekdays', label: '평일' },
]

/**
 * Repeat options for full task forms (detail panel, roadmap)
 */
export const FULL_REPEAT_OPTIONS: Array<{ value: RepeatType; label: string }> = [
  { value: 'once', label: '1회' },
  { value: 'daily', label: '매일' },
  { value: 'weekdays', label: '평일' },
  { value: 'weekends', label: '주말' },
]

/**
 * Repeat preset options (once 제외, 토글 ON일 때 표시)
 * "매주" 제거 → 요일 토글 피커로 대체
 */
export const REPEAT_PATTERN_OPTIONS: Array<{ value: RepeatType; label: string }> = [
  { value: 'daily', label: '매일' },
  { value: 'weekdays', label: '평일' },
  { value: 'weekends', label: '주말' },
]

/**
 * Time slot picker options for task forms
 */
export const TIME_SLOT_OPTIONS: Array<{ value: TimeSlot; label: string }> = [
  { value: 'anytime', label: '⏰ 언제든' },
  { value: 'dawn', label: '🌃 새벽' },
  { value: 'morning', label: '☀️ 오전' },
  { value: 'afternoon', label: '🌞 오후' },
  { value: 'evening', label: '🌙 저녁' },
]

/**
 * Get a sensible default specific_time for a given time slot (midpoint of range).
 */
export function getSlotDefaultTime(slot: TimeSlot): string {
  const config = TIME_SLOT_CONFIG[slot]
  if (!config || slot === 'anytime') return '09:00'
  const midHour = Math.floor((config.hours[0] + config.hours[1]) / 2)
  return `${String(midHour).padStart(2, '0')}:00`
}

/**
 * Check if a specific_time "HH:MM" falls within a slot's hour range.
 */
export function isTimeInSlot(time: string, slot: TimeSlot): boolean {
  const config = TIME_SLOT_CONFIG[slot]
  if (!config || slot === 'anytime') return false
  const [h] = time.split(':').map(Number)
  return h >= config.hours[0] && h < config.hours[1]
}

/**
 * Get min/max time strings for <input type="time"> based on slot.
 */
export function getSlotTimeRange(slot: TimeSlot): { min: string; max: string } {
  const config = TIME_SLOT_CONFIG[slot]
  if (!config || slot === 'anytime') return { min: '00:00', max: '23:59' }
  const [start, end] = config.hours
  return {
    min: `${String(start).padStart(2, '0')}:00`,
    max: `${String(Math.min(end - 1, 23)).padStart(2, '0')}:59`,
  }
}
