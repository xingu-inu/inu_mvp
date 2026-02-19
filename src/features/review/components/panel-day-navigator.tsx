'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO, eachDayOfInterval } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReviewStore } from '@/stores/review.store'
import { useCheckInHistory } from '../hooks/use-checkin-history'
import { useMoodHistory } from '../hooks/use-mood-history'
import { useReviewPeriod } from '../hooks/use-review-period'
import type { DayHistory } from '../hooks/use-checkin-history'
import type { MoodEntry } from '../hooks/use-mood-history'

const MOOD_EMOJIS: Record<string, string> = {
  terrible: '😫',
  bad: '😕',
  neutral: '😐',
  good: '🙂',
  great: '😄',
}

export function PanelDayNavigator() {
  const { startDate, endDate } = useReviewPeriod()
  const { data: checkInHistory } = useCheckInHistory()
  const { data: moodHistory } = useMoodHistory()
  const selectDay = useReviewStore((s) => s.selectDay)
  const selectedDate = useReviewStore((s) => s.selectedDate)

  const days = useMemo(() => {
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    return eachDayOfInterval({ start, end }).reverse() // newest first
  }, [startDate, endDate])

  const checkInMap = useMemo(() => {
    const map = new Map<string, DayHistory>()
    checkInHistory?.forEach((d) => map.set(d.date, d))
    return map
  }, [checkInHistory])

  const moodMap = useMemo(() => {
    const map = new Map<string, string>()
    moodHistory?.forEach((m: MoodEntry) => map.set(m.date, m.mood))
    return map
  }, [moodHistory])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col px-5 py-4"
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        <span className="text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
          날짜별 기록
        </span>
      </div>

      {/* Day list */}
      <div className="flex flex-col gap-0.5">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayData = checkInMap.get(dateStr)
          const mood = moodMap.get(dateStr)
          const isSelected = selectedDate === dateStr
          const rate =
            dayData && dayData.total > 0 ? Math.round((dayData.completed / dayData.total) * 100) : 0

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => selectDay(dateStr)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2 py-2 transition-colors',
                isSelected ? 'bg-[var(--color-primary-50)]' : 'hover:bg-[var(--color-bg-secondary)]'
              )}
            >
              <div className="w-12 text-left">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {format(day, 'M/d')}
                </span>
                <span className="ml-1 text-[10px] text-[var(--color-text-tertiary)]">
                  {format(day, 'EEE', { locale: ko })}
                </span>
              </div>

              <span className="w-5 text-center text-sm">
                {mood ? (MOOD_EMOJIS[mood] ?? '·') : '·'}
              </span>

              {dayData && dayData.total > 0 ? (
                <>
                  <div className="h-1.5 flex-1 rounded-full bg-[var(--color-bg-tertiary)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-done)] transition-all"
                      style={{ width: `${Math.max(rate, 2)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-[10px] text-[var(--color-text-secondary)]">
                    {dayData.completed}/{dayData.total}
                  </span>
                </>
              ) : (
                <span className="flex-1 text-right text-xs text-[var(--color-text-tertiary)]">
                  —
                </span>
              )}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
