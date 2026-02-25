'use client'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AreaBalance } from '../utils/timeline-utils'
import type { AreaTrendData } from '../hooks/use-area-trend'
import type { AreaReviewData } from '../hooks/use-review-roadmap-data'

const INITIAL_VISIBLE = 4

interface AreaListProps {
  areas: AreaBalance[]
  trends: AreaTrendData[]
  roadmapData: AreaReviewData[]
  selectedAreaId: string | null
  onSelectArea: (areaId: string) => void
}

function getGoalStatusSummary(areaData: AreaReviewData | undefined): string {
  if (!areaData) return ''
  const goals = areaData.goals
  const total = goals.length
  const active = goals.filter((g) => g.goal.status === 'active').length
  const completed = goals.filter((g) => g.goal.status === 'completed').length
  const paused = goals.filter((g) => g.goal.status === 'paused').length

  const parts: string[] = [`목표 ${total}`]
  if (active > 0) parts.push(`진행 ${active}`)
  if (completed > 0) parts.push(`완료 ${completed}`)
  if (paused > 0) parts.push(`멈춤 ${paused}`)
  return parts.join(' · ')
}

function getTrendArrow(points: AreaTrendData['points']): { arrow: string; className: string } {
  if (points.length < 2) return { arrow: '→', className: 'text-[var(--color-text-tertiary)]' }
  const first = points[0].completionRate
  const last = points[points.length - 1].completionRate
  const diff = last - first
  if (diff > 5) return { arrow: '↑', className: 'text-emerald-500' }
  if (diff < -5) return { arrow: '↓', className: 'text-red-400' }
  return { arrow: '→', className: 'text-[var(--color-text-tertiary)]' }
}

export function AreaList({
  areas,
  trends,
  roadmapData,
  selectedAreaId,
  onSelectArea,
}: AreaListProps) {
  const [showAll, setShowAll] = useState(false)

  const trendMap = useMemo(() => new Map(trends.map((t) => [t.areaId, t])), [trends])

  const roadmapMap = useMemo(() => new Map(roadmapData.map((d) => [d.area.id, d])), [roadmapData])

  if (areas.length === 0) return null

  const visibleAreas = showAll ? areas : areas.slice(0, INITIAL_VISIBLE)
  const hiddenCount = areas.length - INITIAL_VISIBLE

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <span className="mb-1.5 block text-xs font-medium tracking-wider text-[var(--color-text-tertiary)] uppercase">
        영역별 현황
      </span>
      <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        {visibleAreas.map((area) => {
          const trend = trendMap.get(area.areaId)
          const areaData = roadmapMap.get(area.areaId)
          const { arrow, className: arrowClass } = trend
            ? getTrendArrow(trend.points)
            : { arrow: '→', className: 'text-[var(--color-text-tertiary)]' }
          const rate = Math.round(area.completionRate)
          const statusSummary = getGoalStatusSummary(areaData)
          const isSelected = area.areaId === selectedAreaId

          return (
            <motion.button
              key={area.areaId}
              type="button"
              onClick={() => onSelectArea(area.areaId)}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'flex w-full flex-col gap-1 px-4 py-3.5 text-left transition-colors first:rounded-t-xl last:rounded-b-xl',
                isSelected
                  ? 'bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-950)]'
                  : 'hover:bg-[var(--color-bg-secondary)]'
              )}
            >
              {/* Row 1: emoji + name + progress bar + trend + percentage */}
              <div className="flex items-center gap-2.5">
                <span className="shrink-0 text-base">{area.areaEmoji}</span>
                <span className="max-w-[140px] min-w-[60px] truncate text-sm font-medium text-[var(--color-text-primary)]">
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
              </div>
              {/* Row 2: goal status summary */}
              <div className="pl-8">
                <span className="text-sm text-[var(--color-text-tertiary)]">{statusSummary}</span>
              </div>
            </motion.button>
          )
        })}

        {areas.length > INITIAL_VISIBLE && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="flex w-full items-center justify-center gap-1 py-3 text-xs text-[var(--color-text-tertiary)] transition-colors last:rounded-b-xl hover:bg-[var(--color-bg-secondary)]"
          >
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', showAll && 'rotate-180')}
            />
            {showAll ? '접기' : `나머지 ${hiddenCount}개 영역`}
          </button>
        )}
      </div>
    </motion.section>
  )
}
