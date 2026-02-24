'use client'

import { useMemo } from 'react'
import { parseISO, eachDayOfInterval, format, getDay } from 'date-fns'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { JournalHeatmap } from './journal/journal-heatmap'
import { MOOD_EMOJIS } from '../utils/review-utils'
import type { DayHistory } from '../hooks/use-checkin-history'
import type { MoodEntry } from '../hooks/use-mood-history'
import type { MoodLevel } from '@/types/entities'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

interface DailyHeatmapProps {
  checkInHistory: DayHistory[]
  moodHistory: MoodEntry[]
  startDate: string
  endDate: string
  isWeek: boolean
  onSelectDate: (date: string) => void
  selectedDate: string | null
}

interface WeekDayData {
  date: string
  dayLabel: string
  mood: MoodLevel | null
  completionRate: number | null
}

interface WeekViewProps {
  days: WeekDayData[]
  onSelectDate: (date: string) => void
  selectedDate: string | null
}

function WeekView({ days, onSelectDate, selectedDate }: WeekViewProps) {
  return (
    <div className="flex gap-1">
      {days.map((day) => {
        const isSelected = selectedDate === day.date
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelectDate(day.date)}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 rounded-lg p-2 transition-colors',
              isSelected
                ? 'bg-[var(--color-primary-50)] ring-2 ring-[var(--color-primary-400)]'
                : 'hover:bg-[var(--color-bg-secondary)]'
            )}
          >
            <span className="text-[10px] text-[var(--color-text-tertiary)]">{day.dayLabel}</span>
            <span className="text-sm leading-none">{day.mood ? MOOD_EMOJIS[day.mood] : '·'}</span>
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              {day.completionRate !== null ? `${day.completionRate}%` : '—'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function DailyHeatmap({
  checkInHistory,
  moodHistory,
  startDate,
  endDate,
  isWeek,
  onSelectDate,
  selectedDate,
}: DailyHeatmapProps) {
  const checkInMap = useMemo(() => {
    const map = new Map<string, DayHistory>()
    checkInHistory.forEach((d) => map.set(d.date, d))
    return map
  }, [checkInHistory])

  const moodMap = useMemo(() => {
    const map = new Map<string, MoodLevel>()
    moodHistory.forEach((m) => map.set(m.date, m.mood))
    return map
  }, [moodHistory])

  const weekDays = useMemo<WeekDayData[]>(() => {
    if (!isWeek) return []
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    return eachDayOfInterval({ start, end }).map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const history = checkInMap.get(dateStr)
      const mood = moodMap.get(dateStr) ?? null
      const completionRate =
        history && history.total > 0 ? Math.round((history.completed / history.total) * 100) : null
      return {
        date: dateStr,
        dayLabel: DAY_LABELS[getDay(date)],
        mood,
        completionRate,
      }
    })
  }, [isWeek, startDate, endDate, checkInMap, moodMap])

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <span className="mb-1.5 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
        일별 기록
      </span>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
        {isWeek ? (
          <WeekView days={weekDays} onSelectDate={onSelectDate} selectedDate={selectedDate} />
        ) : (
          <JournalHeatmap
            checkInHistory={checkInHistory}
            startDate={startDate}
            endDate={endDate}
            isWeek={false}
            onSelectDate={onSelectDate}
            selectedDate={selectedDate}
          />
        )}
      </div>
    </motion.section>
  )
}
