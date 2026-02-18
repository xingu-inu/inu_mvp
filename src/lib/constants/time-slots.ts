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
 * Display slots (anytime 제외, 그리드 렌더링용 4개 슬롯)
 */
export const DISPLAY_SLOTS = ['dawn', 'morning', 'afternoon', 'evening'] as const
export type DisplaySlot = (typeof DISPLAY_SLOTS)[number]

/**
 * Get the current time slot based on the current hour.
 */
export function getCurrentSlot(): TimeSlot {
  const hour = new Date().getHours()
  if (hour < 6) return 'dawn'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

/**
 * Max visible items per slot in week grid (overflow → "+N more")
 */
export const SLOT_MAX_VISIBLE = 3

/**
 * Dawn slot collapsed height when empty (px)
 */
export const SLOT_DAWN_COLLAPSED_HEIGHT = 32

/**
 * Max visible items in anytime/all-day row per day
 */
export const ANYTIME_MAX_VISIBLE = 3

/**
 * Auto-collapse anytime row when any day exceeds this many items
 */
export const ANYTIME_COLLAPSE_THRESHOLD = 3

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
