'use client'

import { useMemo } from 'react'
import { parseISO, eachDayOfInterval, format } from 'date-fns'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { JournalHeatmap } from '../journal/journal-heatmap'
import { MOOD_EMOJIS } from '../../utils/review-utils'
import type { DayHistory } from '../../hooks/use-checkin-history'
import type { MoodEntry } from '../../hooks/use-mood-history'
import type { MoodLevel } from '@/types/entities'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface DayRecordProps {
  checkInHistory: DayHistory[]
  moodHistory: MoodEntry[]
  startDate: string
  endDate: string
  isWeek: boolean
  onSelectDate: (date: string) => void
  selectedDate: string | null
}

const DAY_OF_WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토']

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function WeekDayCell({
  dayLabel,
  mood,
  completionRate,
  isSelected,
  onClick,
}: {
  dayLabel: string
  mood: MoodLevel | null
  completionRate: number | null
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 flex-col items-center gap-1 rounded-lg p-2 transition-colors',
        isSelected
          ? 'bg-[var(--color-primary-50)] ring-2 ring-[var(--color-primary-400)]'
          : 'hover:bg-[var(--color-bg-secondary)]'
      )}
    >
      <span className="text-[10px] text-[var(--color-text-tertiary)]">{dayLabel}</span>
      <span className="text-sm leading-none" aria-label={mood ?? '기분 없음'}>
        {mood ? MOOD_EMOJIS[mood] : '·'}
      </span>
      <span className="text-[10px] text-[var(--color-text-tertiary)]">
        {completionRate !== null ? `${completionRate}%` : '—'}
      </span>
    </button>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function DayRecord({
  checkInHistory,
  moodHistory,
  startDate,
  endDate,
  isWeek,
  onSelectDate,
  selectedDate,
}: DayRecordProps) {
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

  const weekDays = useMemo(() => {
    if (!isWeek) return []
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    return eachDayOfInterval({ start, end }).map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const history = checkInMap.get(dateStr)
      const mood = moodMap.get(dateStr) ?? null
      const completionRate =
        history && history.total > 0 ? Math.round((history.completed / history.total) * 100) : null
      const dayOfWeek = date.getDay()
      return {
        date: dateStr,
        dayLabel: DAY_OF_WEEK_LABELS[dayOfWeek],
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
          <div className="flex gap-1">
            {weekDays.map((day) => (
              <WeekDayCell
                key={day.date}
                dayLabel={day.dayLabel}
                mood={day.mood}
                completionRate={day.completionRate}
                isSelected={selectedDate === day.date}
                onClick={() => onSelectDate(day.date)}
              />
            ))}
          </div>
        ) : (
          <JournalHeatmap
            checkInHistory={checkInHistory}
            moodHistory={moodHistory}
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
