'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AreaBalance } from '../../utils/timeline-utils'
import type { AreaTrendData } from '../../hooks/use-area-trend'
import { AreaBalanceDetail } from '../overview/area-balance-detail'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_VISIBLE = 4

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface AreaOverviewProps {
  areas: AreaBalance[]
  trends: AreaTrendData[]
  onSelectArea: (areaId: string) => void
  selectedAreaId: string | null
  expandedAreaId: string | null
  onToggleArea: (areaId: string) => void
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getTrendArrow(points: AreaTrendData['points']): { arrow: string; className: string } {
  if (points.length < 2) return { arrow: '→', className: 'text-[var(--color-text-tertiary)]' }
  const first = points[0].completionRate
  const last = points[points.length - 1].completionRate
  const diff = last - first
  if (diff > 5) return { arrow: '↑', className: 'text-emerald-500' }
  if (diff < -5) return { arrow: '↓', className: 'text-red-400' }
  return { arrow: '→', className: 'text-[var(--color-text-tertiary)]' }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  const { arrow, className: arrowClass } = getTrendArrow(trendData?.points ?? [])

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
        <span className={cn('shrink-0 text-xs font-medium', arrowClass)}>{arrow}</span>
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
        <span className={cn('shrink-0 text-xs font-medium', arrowClass)}>{arrow}</span>
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

export function AreaOverview({
  areas,
  trends,
  onSelectArea,
  selectedAreaId,
  expandedAreaId,
  onToggleArea,
}: AreaOverviewProps) {
  const [showAll, setShowAll] = useState(false)

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
        영역별 현황
      </span>

      <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        {visibleAreas.map((area) => (
          <AreaRow
            key={area.areaId}
            area={area}
            trendData={trends.find((t) => t.areaId === area.areaId)}
            isSelected={selectedAreaId === area.areaId}
            isExpanded={expandedAreaId === area.areaId}
            onDesktopSelect={() => onSelectArea(area.areaId)}
            onMobileToggle={() => onToggleArea(area.areaId)}
          />
        ))}

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
