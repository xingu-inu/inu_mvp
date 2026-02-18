import type { TimeSlot } from '@/types/entities'

const VALID_TIME_SLOTS: TimeSlot[] = ['dawn', 'morning', 'afternoon', 'evening', 'anytime']

/** AI 응답 값을 Zod 스키마에 맞게 타입 변환/검증. AI 추천은 항상 일회성(once) */
export function sanitizeAiTask(
  task: {
    name?: string
    why?: string
    duration_minutes?: number
    time_slot?: string
  },
  scheduledDate: string
) {
  const dur = Number(task.duration_minutes)

  return {
    name: task.name || '',
    why: task.why ?? undefined,
    repeat_type: 'once' as const,
    scheduled_date: scheduledDate,
    duration_minutes: Number.isFinite(dur) && dur >= 1 ? dur : 15,
    time_slot: VALID_TIME_SLOTS.includes(task.time_slot as TimeSlot)
      ? (task.time_slot as TimeSlot)
      : ('anytime' as TimeSlot),
  }
}
