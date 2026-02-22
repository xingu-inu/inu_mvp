'use client'

import { useMemo } from 'react'
import { parseISO, eachDayOfInterval, format, getDay } from 'date-fns'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { DayHistory } from '../../hooks/use-checkin-history'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

interface JournalHeatmapProps {
  checkInHistory: DayHistory[]
  startDate: string
  endDate: string
  isWeek: boolean
  onSelectDate: (date: string) => void
  selectedDate?: string | null
}

function getHeatmapColor(completed: number, total: number): string {
  if (total === 0) return 'bg-[var(--color-bg-tertiary)]'
  const rate = completed / total
  if (rate === 0) return 'bg-[var(--color-bg-tertiary)]'
  if (rate <= 0.5) return 'bg-emerald-200 dark:bg-emerald-800/60'
  if (rate < 1) return 'bg-emerald-400 dark:bg-emerald-600/70'
  return 'bg-emerald-600 dark:bg-emerald-500'
}

export function JournalHeatmap({
  checkInHistory,
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

  const days = useMemo(() => {
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    return eachDayOfInterval({ start, end }).map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const history = historyMap.get(dateStr)
      return {
        date: dateStr,
        dayOfWeek: getDay(date),
        completed: history?.completed ?? 0,
        total: history?.total ?? 0,
      }
    })
  }, [startDate, endDate, historyMap])

  if (isWeek) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-1"
      >
        <div className="flex justify-center gap-1">
          {DAY_LABELS.map((label) => (
            <span
              key={label}
              className="flex h-6 w-8 items-center justify-center text-[10px] text-[var(--color-text-tertiary)]"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="flex justify-center gap-1">
          {days.map((day) => (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate(day.date)}
              className={cn(
                'h-8 w-8 rounded-md transition-transform hover:scale-110',
                getHeatmapColor(day.completed, day.total),
                selectedDate === day.date &&
                  'ring-2 ring-[var(--color-primary-500)] ring-offset-1 ring-offset-[var(--color-bg-primary)]'
              )}
              title={`${day.date} (${day.completed}/${day.total})`}
            />
          ))}
        </div>
      </motion.div>
    )
  }

  // Month mode: 7-column grid
  // Pad beginning with empty cells based on the first day's dayOfWeek
  const firstDayOfWeek = days.length > 0 ? days[0].dayOfWeek : 0
  const paddingCells = Array.from({ length: firstDayOfWeek }, (_, i) => i)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="space-y-1"
    >
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label) => (
          <span
            key={label}
            className="flex h-5 items-center justify-center text-[10px] text-[var(--color-text-tertiary)]"
          >
            {label}
          </span>
        ))}
        {paddingCells.map((i) => (
          <div key={`pad-${i}`} className="h-8 w-8" />
        ))}
        {days.map((day) => (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelectDate(day.date)}
            className={cn(
              'h-8 w-8 rounded-md transition-transform hover:scale-110',
              getHeatmapColor(day.completed, day.total),
              selectedDate === day.date &&
                'ring-2 ring-[var(--color-primary-500)] ring-offset-1 ring-offset-[var(--color-bg-primary)]'
            )}
            title={`${day.date} (${day.completed}/${day.total})`}
          />
        ))}
      </div>
    </motion.div>
  )
}
