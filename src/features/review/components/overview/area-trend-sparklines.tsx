'use client'

import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { useAreaTrend } from '../../hooks/use-area-trend'
import type { AreaTrendData, AreaTrendPoint } from '../../hooks/use-area-trend'

// ---- SVG Sparkline ----

const SPARK_W = 120
const SPARK_H = 32
const SPARK_PAD = 4

function Sparkline({ points, color }: { points: AreaTrendPoint[]; color: string }) {
  if (points.length < 2) return null

  const maxVal = Math.max(...points.map((p) => p.completionRate), 1)
  const stepX = (SPARK_W - SPARK_PAD * 2) / (points.length - 1)

  const pathData = points
    .map((p, i) => {
      const x = SPARK_PAD + i * stepX
      const y = SPARK_H - SPARK_PAD - (p.completionRate / maxVal) * (SPARK_H - SPARK_PAD * 2)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const lastPoint = points[points.length - 1]
  const lastX = SPARK_PAD + (points.length - 1) * stepX
  const lastY =
    SPARK_H - SPARK_PAD - (lastPoint.completionRate / maxVal) * (SPARK_H - SPARK_PAD * 2)

  return (
    <svg
      width={SPARK_W}
      height={SPARK_H}
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      role="img"
      aria-label="영역 완료율 추이"
      className="shrink-0"
    >
      <motion.path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      <motion.circle
        cx={lastX}
        cy={lastY}
        r={3}
        fill={color}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
      />
    </svg>
  )
}

// ---- Trend direction helper ----

function getTrendInfo(points: AreaTrendPoint[]): {
  direction: 'up' | 'down' | 'flat'
  delta: number
} {
  if (points.length < 2) return { direction: 'flat', delta: 0 }
  const first = points[0].completionRate
  const last = points[points.length - 1].completionRate
  const delta = last - first
  if (delta > 3) return { direction: 'up', delta }
  if (delta < -3) return { direction: 'down', delta }
  return { direction: 'flat', delta: 0 }
}

// ---- Area Trend Row ----

function AreaTrendRow({ data }: { data: AreaTrendData }) {
  const { direction, delta } = getTrendInfo(data.points)
  const last = data.points[data.points.length - 1]

  return (
    <div className="flex items-center gap-3 rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2">
      <span className="shrink-0 text-sm">{data.areaEmoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">
          {data.areaName}
        </p>
        <div className="mt-0.5 flex items-center gap-1">
          <span className="font-mono text-[10px] font-medium text-[var(--color-text-secondary)]">
            {last?.completionRate ?? 0}%
          </span>
          {direction === 'up' && <span className="text-[10px] text-emerald-600">+{delta}%</span>}
          {direction === 'down' && (
            <span className="text-[10px] text-[var(--color-text-tertiary)]">{delta}%</span>
          )}
        </div>
      </div>
      <Sparkline points={data.points} color={data.areaColor} />
    </div>
  )
}

// ---- Main Component ----

export function AreaTrendSparklines() {
  const { data: trends, isLoading } = useAreaTrend()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--color-bg-secondary)]" />
        ))}
      </div>
    )
  }

  if (!trends || trends.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
    >
      <div className="flex items-center gap-2">
        <TrendingUp className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
        <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">영역별 추이</h3>
      </div>

      <div className="mt-3 space-y-2">
        {trends.map((trend) => (
          <AreaTrendRow key={trend.areaId} data={trend} />
        ))}
      </div>
    </motion.section>
  )
}
