import type { RepeatType } from '@/types/entities'

export const REPEAT_LABELS: Record<RepeatType, string> = {
  once: '1회',
  daily: '매일',
  weekdays: '평일',
  weekends: '주말',
  weekly: '매주',
  custom: '맞춤',
}
