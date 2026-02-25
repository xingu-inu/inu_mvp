'use client'

import { isToday as isTodayFn, isFuture, startOfDay } from 'date-fns'
import { Mascot } from '@/components/common/mascot'

import type { MascotMood } from '@/components/common/mascot'
import type { HomeTask } from '@/types/entities'

interface PastDaySummaryProps {
  tasks: HomeTask[]
  selectedDate?: Date
}

function getPastMessage(rate: number): string {
  if (rate >= 100) return '완벽한 하루였어요!'
  if (rate >= 70) return '좋은 하루였어요'
  if (rate >= 30) return '할 수 있는 만큼 했어요'
  return '바쁜 하루였나 봐요'
}

function getTodayMessage(rate: number): string {
  if (rate >= 100) return '오늘 할 일을 모두 끝냈어요!'
  if (rate >= 70) return '거의 다 했어요!'
  if (rate >= 30) return '잘 하고 있어요'
  return '오늘도 화이팅!'
}

function getFutureMessage(): string {
  return '할 일이 준비되어 있어요'
}

function getEncouragingMessage(rate: number, selectedDate?: Date): string {
  if (selectedDate && isFuture(startOfDay(selectedDate))) return getFutureMessage()
  if (selectedDate && isTodayFn(selectedDate)) return getTodayMessage(rate)
  return getPastMessage(rate)
}

function getMascotMood(rate: number): MascotMood {
  if (rate >= 100) return 'checkin'
  if (rate >= 70) return 'proud'
  if (rate >= 30) return 'happy'
  return 'encouraging'
}

export function PastDaySummary({ tasks, selectedDate }: PastDaySummaryProps) {
  if (tasks.length === 0) return null

  const doneCount = tasks.filter((t) => t.todayCheckIn?.status === 'done').length
  const totalCount = tasks.length
  const rate = Math.round((doneCount / totalCount) * 100)

  return (
    <div className="mt-2 hidden space-y-2 rounded-xl bg-[var(--color-bg-secondary)] px-4 py-3 lg:block">
      <div className="flex items-center gap-2">
        <Mascot mood={getMascotMood(rate)} size="xs" />
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          {doneCount}/{totalCount} 완료
        </span>
        <span className="text-xs text-[var(--color-text-tertiary)]">
          {getEncouragingMessage(rate, selectedDate)}
        </span>
      </div>
      {/* Full-width progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className="h-full rounded-full bg-[var(--color-done)] transition-all duration-500"
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  )
}
