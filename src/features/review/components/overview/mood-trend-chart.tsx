'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { MOOD_VALUES, MOOD_EMOJIS, MOOD_LABELS } from '../../utils/review-utils'
import type { MoodEntry } from '../../hooks/use-mood-history'

interface MoodTrendChartProps {
  moodHistory: MoodEntry[] | undefined
}

const VIEW_W = 400
const VIEW_H = 120
const PAD = { left: 28, right: 8, top: 12, bottom: 20 }
const CHART_W = VIEW_W - PAD.left - PAD.right
const CHART_H = VIEW_H - PAD.top - PAD.bottom

function toY(mood: keyof typeof MOOD_VALUES) {
  return PAD.top + (1 - (MOOD_VALUES[mood] - 1) / 4) * CHART_H
}

function toX(index: number, total: number) {
  if (total === 1) return PAD.left + CHART_W / 2
  return PAD.left + (index / (total - 1)) * CHART_W
}

export function MoodTrendChart({ moodHistory }: MoodTrendChartProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  const entries = useMemo(
    () => (moodHistory ?? []).slice().sort((a, b) => a.date.localeCompare(b.date)),
    [moodHistory]
  )

  const points = useMemo(
    () =>
      entries.map((e, i) => ({
        x: toX(i, entries.length),
        y: toY(e.mood),
        mood: e.mood,
        date: e.date,
      })),
    [entries]
  )

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  // Grid lines at each mood level
  const gridLines = [1, 2, 3, 4, 5].map((level) => {
    const y = PAD.top + (1 - (level - 1) / 4) * CHART_H
    return { y, level }
  })

  if (entries.length < 2) {
    return (
      <div
        role="img"
        aria-label="기분 변화 추이"
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
      >
        <div className="mb-2 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">기분 트렌드</span>
        </div>
        <div className="flex h-16 items-center justify-center">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            기분을 기록하면 트렌드를 볼 수 있어요
          </p>
        </div>
      </div>
    )
  }

  const selected = selectedIdx !== null ? points[selectedIdx] : null
  const selectedEntry = selectedIdx !== null ? entries[selectedIdx] : null

  return (
    <div
      role="img"
      aria-label="기분 변화 추이"
      className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
    >
      <div className="mb-1 flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">기분 트렌드</span>
      </div>

      {/* Tooltip */}
      {selected && selectedEntry && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated,var(--color-bg-card))] px-2 py-1 shadow-sm"
          style={{
            top: 8,
            right: 12,
          }}
        >
          <p className="text-xs font-medium text-[var(--color-text-primary)]">
            {format(parseISO(selectedEntry.date), 'M월 d일', { locale: ko })}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {MOOD_EMOJIS[selectedEntry.mood]} {MOOD_LABELS[selectedEntry.mood]}
          </p>
        </div>
      )}

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        style={{ height: 120 }}
        aria-hidden="true"
      >
        {/* Grid lines */}
        {gridLines.map(({ y, level }) => (
          <line
            key={level}
            x1={PAD.left}
            y1={y}
            x2={VIEW_W - PAD.right}
            y2={y}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth={1}
            className="text-[var(--color-text-primary)]"
          />
        ))}

        {/* Y-axis emoji labels (top=😄, bottom=😫 only) */}
        <text
          x={PAD.left - 4}
          y={PAD.top + 4}
          textAnchor="end"
          fontSize={10}
          dominantBaseline="middle"
        >
          😄
        </text>
        <text
          x={PAD.left - 4}
          y={PAD.top + CHART_H}
          textAnchor="end"
          fontSize={10}
          dominantBaseline="middle"
        >
          😫
        </text>

        {/* Animated polyline */}
        {points.length >= 2 && (
          <motion.polyline
            points={polylinePoints}
            fill="none"
            stroke="var(--color-primary-400)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={selectedIdx === i ? 6 : 4}
            fill="var(--color-primary-400)"
            stroke="var(--color-bg-card)"
            strokeWidth={2}
            style={{ cursor: 'pointer', transition: 'r 0.15s' }}
            onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
            onMouseEnter={() => setSelectedIdx(i)}
            onMouseLeave={() => setSelectedIdx(null)}
          />
        ))}
      </svg>
    </div>
  )
}
