'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AreaBalance } from '../../utils/timeline-utils'
import type { AreaTrendData, AreaTrendPoint } from '../../hooks/use-area-trend'
import { AreaBalanceDetail } from './area-balance-detail'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_VISIBLE = 4
const SPARK_W = 80
const SPARK_H = 24
const SPARK_PAD = 3

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AreaBalanceViewProps {
  areas: AreaBalance[]
  trends?: AreaTrendData[]
  selectedAreaId: string | null
  onSelectArea: (areaId: string) => void
  expandedAreaId: string | null
  onToggleArea: (areaId: string) => void
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Sparkline({ points, color }: { points: AreaTrendPoint[]; color: string }) {
  if (points.length < 2) return <div style={{ width: SPARK_W, height: SPARK_H }} />

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
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      <motion.circle
        cx={lastX}
        cy={lastY}
        r={2.5}
        fill={color}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
      />
    </svg>
  )
}

function AreaRow({
  area,
  trendData,
  isSelected,
  isExpanded,
  onDesktopSelect,
  onMobileToggle,
}: {
  area: AreaBalance
  trendData: AreaTrendData | undefined
  isSelected: boolean
  isExpanded: boolean
  onDesktopSelect: () => void
  onMobileToggle: () => void
}) {
  const rate = Math.round(area.completionRate)
  const sparkPoints = trendData?.points ?? []

  return (
    <div>
      {/* Desktop row */}
      <button
        type="button"
        onClick={onDesktopSelect}
        className={cn(
          'hidden h-10 w-full items-center gap-2.5 px-3 transition-colors lg:flex',
          isSelected && 'bg-[var(--color-bg-secondary)]'
        )}
      >
        <span className="shrink-0 text-sm">{area.areaEmoji}</span>
        <span className="max-w-[88px] min-w-[60px] truncate text-left text-xs font-medium text-[var(--color-text-primary)]">
          {area.areaName}
        </span>
        <div className="h-1.5 flex-1 rounded-full bg-[var(--color-bg-tertiary)]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.max(rate, 2)}%`, backgroundColor: area.areaColor }}
          />
        </div>
        {sparkPoints.length >= 2 && <Sparkline points={sparkPoints} color={area.areaColor} />}
        <span className="w-8 text-right font-mono text-[10px] text-[var(--color-text-secondary)]">
          {rate}%
        </span>
      </button>

      {/* Mobile row */}
      <button
        type="button"
        onClick={onMobileToggle}
        className="flex h-11 w-full items-center gap-3 px-3 transition-colors lg:hidden"
      >
        <span className="shrink-0 text-base">{area.areaEmoji}</span>
        <span className="max-w-[100px] min-w-[80px] truncate text-left text-sm font-medium text-[var(--color-text-primary)]">
          {area.areaName}
        </span>
        <div className="h-2 flex-1 rounded-full bg-[var(--color-bg-tertiary)]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.max(rate, 2)}%`, backgroundColor: area.areaColor }}
          />
        </div>
        {sparkPoints.length >= 2 && <Sparkline points={sparkPoints} color={area.areaColor} />}
        <span className="w-9 text-right font-mono text-xs text-[var(--color-text-secondary)]">
          {rate}%
        </span>
      </button>

      {/* Mobile accordion detail */}
      <div className="lg:hidden">
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="border-t border-[var(--color-border)] px-4 py-3">
                <AreaBalanceDetail areaId={area.areaId} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function AreaBalanceView({
  areas,
  trends = [],
  selectedAreaId,
  onSelectArea,
  expandedAreaId,
  onToggleArea,
}: AreaBalanceViewProps) {
  const [showAll, setShowAll] = useState(false)

  // Phase 7-3: build Map once instead of trends.find() inside render loop
  const trendMap = useMemo(() => new Map(trends.map((t) => [t.areaId, t])), [trends])

  if (areas.length === 0) return null

  const needsCollapse = areas.length > MAX_VISIBLE
  const visibleAreas = needsCollapse && !showAll ? areas.slice(0, MAX_VISIBLE) : areas
  const hiddenCount = areas.length - MAX_VISIBLE

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <span className="mb-1.5 block text-[10px] font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
        영역별 균형
      </span>

      <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        {visibleAreas.map((area) => (
          <AreaRow
            key={area.areaId}
            area={area}
            trendData={trendMap.get(area.areaId)}
            isSelected={selectedAreaId === area.areaId}
            isExpanded={expandedAreaId === area.areaId}
            onDesktopSelect={() => onSelectArea(area.areaId)}
            onMobileToggle={() => onToggleArea(area.areaId)}
          />
        ))}

        {/* Show more / less toggle */}
        {needsCollapse && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="flex h-9 w-full items-center justify-center gap-1 text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
          >
            {showAll ? '접기' : `나머지 ${hiddenCount}개 영역`}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', showAll && 'rotate-180')}
            />
          </button>
        )}
      </div>
    </motion.section>
  )
}

// Re-export aliases for backward compatibility
export { AreaBalanceView as AreaBalanceBars }
export { AreaBalanceView as AreaBalanceUnified }
