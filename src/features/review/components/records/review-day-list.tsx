'use client'

import { useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { eachDayOfInterval, format, parseISO, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { DayHistory } from '../../hooks/use-checkin-history'
import type { MoodEntry } from '../../hooks/use-mood-history'

const MOOD_EMOJIS: Record<string, string> = {
  terrible: '😫',
  bad: '😕',
  neutral: '😐',
  good: '🙂',
  great: '😄',
}

const MOOD_VALUES: Record<string, number> = {
  terrible: 1,
  bad: 2,
  neutral: 3,
  good: 4,
  great: 5,
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Compact mood trend line
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CompactMoodTrend({ moodHistory }: { moodHistory: MoodEntry[] }) {
  const entries = useMemo(
    () => moodHistory.slice().sort((a, b) => a.date.localeCompare(b.date)),
    [moodHistory]
  )

  if (entries.length < 2) return null

  const W = 200
  const H = 28
  const PAD = 3

  const points = entries.map((e, i) => {
    const x = PAD + (i / (entries.length - 1)) * (W - PAD * 2)
    const val = MOOD_VALUES[e.mood] ?? 3
    const y = H - PAD - ((val - 1) / 4) * (H - PAD * 2)
    return { x, y }
  })

  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')

  const lastPoint = points[points.length - 1]

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[10px] font-medium text-[var(--color-text-tertiary)]">😫</span>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="flex-1"
        role="img"
        aria-label="기분 트렌드"
      >
        <motion.path
          d={pathData}
          fill="none"
          stroke="var(--color-primary-400)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        <motion.circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={2.5}
          fill="var(--color-primary-400)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.2 }}
        />
      </svg>
      <span className="shrink-0 text-[10px] font-medium text-[var(--color-text-tertiary)]">😄</span>
    </div>
  )
}

interface ReviewDayListProps {
  checkInHistory: DayHistory[]
  moodHistory: MoodEntry[]
  startDate: string
  endDate: string
  onSelectDate: (date: string) => void
  selectedDate: string | null
}

export function ReviewDayList({
  checkInHistory,
  moodHistory,
  startDate,
  endDate,
  onSelectDate,
  selectedDate,
}: ReviewDayListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  const days = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  })

  const checkInMap = new Map(checkInHistory.map((d) => [d.date, d]))
  const moodMap = new Map(moodHistory.map((m) => [m.date, m.mood]))

  // Auto-scroll to selected card or today
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [selectedDate])

  const fitsInline = days.length <= 10

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
      {/* Compact mood trend */}
      {moodHistory.length >= 2 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2">
          <span className="mb-1 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
            기분 트렌드
          </span>
          <CompactMoodTrend moodHistory={moodHistory} />
        </div>
      )}

      {/* Day cards */}
      <div
        ref={scrollRef}
        className={cn(
          'flex gap-2',
          fitsInline ? '' : 'scrollbar-none snap-x snap-mandatory overflow-x-auto pb-2'
        )}
      >
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const history = checkInMap.get(dateStr)
          const mood = moodMap.get(dateStr)
          const hasData = !!history
          const isSelected = selectedDate === dateStr
          const today = isToday(day)
          const pct =
            hasData && history.total > 0 ? Math.round((history.completed / history.total) * 100) : 0

          return (
            <button
              key={dateStr}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                'flex snap-center flex-col items-center gap-1 rounded-xl px-3 py-2.5 transition-all',
                fitsInline ? 'min-w-0 flex-1' : 'min-w-[64px] shrink-0',
                isSelected
                  ? 'bg-[var(--color-primary-50)] ring-2 ring-[var(--color-primary-400)]'
                  : 'bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]',
                today && !isSelected && 'ring-1 ring-[var(--color-border)]'
              )}
            >
              {/* Date */}
              <span
                className={cn(
                  'text-xs font-medium',
                  isSelected
                    ? 'text-[var(--color-primary-600)]'
                    : 'text-[var(--color-text-primary)]'
                )}
              >
                {format(day, 'M/d')}
              </span>

              {/* Day of week */}
              <span className="text-[10px] text-[var(--color-text-tertiary)]">
                {format(day, 'EEE', { locale: ko })}
              </span>

              {/* Mood emoji */}
              <span className="text-lg leading-none">
                {mood ? (
                  MOOD_EMOJIS[mood]
                ) : (
                  <span className="text-sm text-[var(--color-text-tertiary)]">·</span>
                )}
              </span>

              {/* Mini circular progress */}
              <div className="relative flex h-7 w-7 items-center justify-center">
                <svg className="h-7 w-7 -rotate-90" viewBox="0 0 28 28">
                  <circle
                    cx="14"
                    cy="14"
                    r="11"
                    fill="none"
                    stroke="var(--color-bg-tertiary)"
                    strokeWidth="3"
                  />
                  {hasData && history.total > 0 && (
                    <circle
                      cx="14"
                      cy="14"
                      r="11"
                      fill="none"
                      stroke="var(--color-done)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${pct * 0.691} 100`}
                    />
                  )}
                </svg>
                <span className="absolute text-[8px] font-medium text-[var(--color-text-secondary)]">
                  {hasData ? `${history.completed}` : '—'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
