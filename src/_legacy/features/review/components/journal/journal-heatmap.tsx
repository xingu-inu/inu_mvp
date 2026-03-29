'use client'

import { useMemo } from 'react'
import { parseISO, eachDayOfInterval, format, getDay, isToday, isFuture } from 'date-fns'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { MOOD_EMOJIS } from '../../utils/review-utils'
import type { DayHistory } from '../../hooks/use-checkin-history'
import type { MoodEntry } from '../../hooks/use-mood-history'
import type { MoodLevel } from '@/types/entities'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

interface JournalHeatmapProps {
  checkInHistory: DayHistory[]
  moodHistory: MoodEntry[]
  startDate: string
  endDate: string
  isWeek: boolean
  onSelectDate: (date: string) => void
  selectedDate?: string | null
}

function getCellBg(completed: number, total: number): string {
  if (total === 0) return 'bg-[var(--color-bg-secondary)]'
  const rate = completed / total
  if (rate === 0) return 'bg-[var(--color-bg-secondary)]'
  if (rate < 0.5) return 'bg-emerald-50 dark:bg-emerald-950/40'
  if (rate < 1) return 'bg-emerald-100 dark:bg-emerald-900/40'
  return 'bg-emerald-200 dark:bg-emerald-800/50'
}

export function JournalHeatmap({
  checkInHistory,
  moodHistory,
  startDate,
  endDate,
  isWeek,
  onSelectDate,
  selectedDate,
}: JournalHeatmapProps) {
  const historyMap = useMemo(() => {
    const map = new Map<string, DayHistory>()
    checkInHistory.forEach((d) => map.set(d.date, d))
    return map
  }, [checkInHistory])

  const moodMap = useMemo(() => {
    const map = new Map<string, MoodLevel>()
    moodHistory.forEach((m) => map.set(m.date, m.mood))
    return map
  }, [moodHistory])

  const days = useMemo(() => {
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    return eachDayOfInterval({ start, end }).map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const history = historyMap.get(dateStr)
      const mood = moodMap.get(dateStr) ?? null
      return {
        date: dateStr,
        dateObj: date,
        dayOfMonth: date.getDate(),
        dayOfWeek: getDay(date),
        completed: history?.completed ?? 0,
        total: history?.total ?? 0,
        mood,
      }
    })
  }, [startDate, endDate, historyMap, moodMap])

  if (isWeek) {
    // Week mode: keep simple colored squares (handled by WeekView in parent)
    return null
  }

  // Month mode: 7-column calendar grid
  const firstDayOfWeek = days.length > 0 ? days[0].dayOfWeek : 0
  const paddingCells = Array.from({ length: firstDayOfWeek }, (_, i) => i)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="space-y-1"
    >
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1.5">
        {DAY_LABELS.map((label) => (
          <span
            key={label}
            className="flex h-5 items-center justify-center text-xs font-medium text-[var(--color-text-tertiary)]"
          >
            {label}
          </span>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Empty padding cells */}
        {paddingCells.map((i) => (
          <div key={`pad-${i}`} className="h-12" />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const isSelected = selectedDate === day.date
          const today = isToday(day.dateObj)
          const future = isFuture(day.dateObj)
          const hasData = day.total > 0

          return (
            <motion.button
              key={day.date}
              type="button"
              onClick={() => onSelectDate(day.date)}
              whileTap={{ scale: 0.93 }}
              className={cn(
                'relative flex h-12 flex-col items-center justify-center gap-1 rounded-lg p-1 transition-all',
                getCellBg(day.completed, day.total),
                isSelected &&
                  'bg-[var(--color-primary-50)] ring-2 ring-[var(--color-primary-500)] ring-offset-1 ring-offset-[var(--color-bg-card)] dark:bg-[var(--color-primary-950)]',
                !isSelected && today && 'ring-1 ring-[var(--color-primary-400)]',
                !isSelected && !today && 'hover:ring-1 hover:ring-[var(--color-border)]',
                future && 'opacity-40'
              )}
            >
              {/* Date number */}
              <span
                className={cn(
                  'text-xs leading-none font-medium',
                  isSelected
                    ? 'text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]'
                    : today
                      ? 'text-[var(--color-primary-500)]'
                      : 'text-[var(--color-text-secondary)]'
                )}
              >
                {day.dayOfMonth}
              </span>

              {/* Mood emoji or completion dot */}
              <span className="text-sm leading-none">
                {day.mood ? (
                  MOOD_EMOJIS[day.mood]
                ) : hasData ? (
                  <span
                    className={cn(
                      'inline-block h-1.5 w-1.5 rounded-full',
                      day.completed === day.total
                        ? 'bg-emerald-500'
                        : day.completed > 0
                          ? 'bg-emerald-300 dark:bg-emerald-600'
                          : 'bg-[var(--color-text-quaternary)]'
                    )}
                  />
                ) : (
                  <span className="inline-block h-1.5 w-1.5" />
                )}
              </span>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}
