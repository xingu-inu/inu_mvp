'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  Compass,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Pause,
  Calendar1,
  Repeat,
  Link,
  Target,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_CONFIG } from '@/lib/goal-status'
import type { SelectedNodeType } from '@/stores/roadmap.store'
import { VIBE_COLORS, type GoalVibe, type VibeColorKey } from '@/stores/goal-vibe.store'

export interface VisualTreeNode {
  type: SelectedNodeType
  id: string
  name: string
  why?: string | null
  emoji?: string
  color?: string
  status?: string
  areaColor?: string
  children?: VisualTreeNode[]
  vibe?: GoalVibe
  meta?: {
    count?: number
    doneCount?: number
    totalCount?: number
    streak?: number
    totalStreak?: number
    targetDate?: string
    isActive?: boolean
    isCompleted?: boolean
    isDone?: boolean
    isPaused?: boolean
    isCompletedTask?: boolean
    repeatType?: string
    hasCrossLinks?: boolean
    sortOrder?: string
    impactAreaColors?: string[]
  }
}

interface TreeNodeCardProps {
  node: VisualTreeNode
  isSelected: boolean
  isExpanded: boolean
  hasChildren: boolean
  onSelect: () => void
  onToggle: () => void
  isSearchMatch?: boolean
  searchQuery?: string
}

export const TreeNodeCard = memo(function TreeNodeCard({
  node,
  isSelected,
  isExpanded,
  hasChildren,
  onSelect,
  onToggle,
  isSearchMatch,
  searchQuery,
}: TreeNodeCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-node-id={node.id}
      data-node-type={node.type}
      data-node-card
      title={node.type === 'group' && node.why ? node.why : undefined}
      className={cn(
        'group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-xl border-2 px-4 py-2.5 shadow-sm transition-all select-none',
        'hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:outline-none',
        getCardStyles(node),
        isSelected &&
          'shadow-[0_0_0_4px_var(--color-primary-100)] ring-2 ring-[var(--color-primary-500)]/60',
        isSearchMatch && !isSelected && 'ring-2 ring-[var(--color-primary-400)]'
      )}
      style={(() => {
        const streakVal =
          node.type === 'goal' ? (node.meta?.totalStreak ?? 0) : (node.meta?.streak ?? 0)
        const hasGlow = (node.type === 'goal' || node.type === 'task') && streakVal >= 7
        const glowColor = node.areaColor ?? node.color

        // Vibe themeColor takes priority over impactAreaColors for goal background
        if (node.type === 'goal' && node.vibe?.themeColor) {
          const hex = VIBE_COLORS[node.vibe.themeColor as VibeColorKey]
          return {
            backgroundColor: `color-mix(in oklch, ${hex} 8%, var(--color-bg-primary))`,
            ...(hasGlow && glowColor
              ? { boxShadow: `0 0 8px color-mix(in oklch, ${glowColor} 20%, transparent)` }
              : {}),
          }
        }

        const hasImpactBg =
          node.type === 'goal' &&
          node.meta?.impactAreaColors &&
          node.meta.impactAreaColors.length > 0

        if (!hasImpactBg && !hasGlow) return undefined
        return {
          ...(hasImpactBg
            ? {
                backgroundColor: `color-mix(in oklch, ${node.meta!.impactAreaColors![0]} 4%, var(--color-bg-primary))`,
              }
            : {}),
          ...(hasGlow && glowColor
            ? { boxShadow: `0 0 8px color-mix(in oklch, ${glowColor} 20%, transparent)` }
            : {}),
        }
      })()}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      {/* Area/Goal 색상 accent bar */}
      {((node.type === 'goal' && node.areaColor) || (node.type === 'area' && node.color)) && (
        <div
          className={cn(
            'absolute inset-y-0 left-0',
            node.type === 'goal' && (node.meta?.impactAreaColors?.length ?? 0) > 0 ? 'w-1.5' : 'w-1'
          )}
          style={(() => {
            if (node.type === 'goal' && node.vibe?.themeColor) {
              return { backgroundColor: VIBE_COLORS[node.vibe.themeColor as VibeColorKey] }
            }
            if (node.type === 'goal' && node.areaColor) {
              const impacts = node.meta?.impactAreaColors
              if (impacts && impacts.length > 0) {
                const primary = node.areaColor
                let stops: string
                if (impacts.length === 1) {
                  stops = `${primary} 50%, ${impacts[0]} 50%`
                } else if (impacts.length === 2) {
                  stops = `${primary} 33%, ${impacts[0]} 33% 66%, ${impacts[1]} 66%`
                } else {
                  // 3+: primary 40%, then split remaining evenly
                  const rest = impacts.slice(0, 3)
                  stops = `${primary} 40%, ${rest[0]} 40% 60%, ${rest[1]} 60% 80%, ${rest[2]} 80%`
                }
                return { background: `linear-gradient(to bottom, ${stops})` }
              }
              return { backgroundColor: node.areaColor }
            }
            return { backgroundColor: node.color! }
          })()}
        />
      )}

      {/* Impact area dots (top-right corner) */}
      {node.type === 'goal' &&
        node.meta?.impactAreaColors &&
        node.meta.impactAreaColors.length > 0 && (
          <div className="absolute -top-1.5 -right-1.5 flex items-center">
            {node.meta.impactAreaColors.map((color) => (
              <div
                key={color}
                className="-ml-1 h-2 w-2 rounded-full border-[1.5px] border-[var(--color-bg-primary)] first:ml-0"
                style={{ backgroundColor: color }}
                title="영향 영역"
              />
            ))}
          </div>
        )}

      {/* Expand/collapse toggle (Direction is always expanded, no toggle) */}
      {hasChildren && node.type !== 'direction' && (
        <button
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded transition-colors hover:bg-[var(--color-bg-tertiary)]"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      {/* Icon */}
      <NodeIcon node={node} />

      {/* Name + optional subtitle */}
      <div className="min-w-0 flex-1">
        <span className={cn('block truncate', getNameStyles(node))}>
          {isSearchMatch && searchQuery ? highlightText(node.name, searchQuery) : node.name}
        </span>
        {node.type === 'direction' && node.why && (
          <span className="block truncate text-[10px] text-[var(--color-text-on-primary)] italic opacity-80">
            {node.why}
          </span>
        )}
      </div>

      {/* Meta badges */}
      <NodeBadge node={node} />
    </div>
  )
})

function NodeIcon({ node }: { node: VisualTreeNode }) {
  switch (node.type) {
    case 'direction':
      return <Compass className="h-4 w-4 flex-shrink-0 text-[var(--color-text-on-primary)]" />
    case 'area':
      return (
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {node.color && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: node.color,
                boxShadow: `0 0 0 2px color-mix(in srgb, ${node.color} 30%, transparent)`,
              }}
            />
          )}
          <span className="text-base">{node.emoji}</span>
        </div>
      )
    case 'goal':
      if (node.vibe?.emoji) {
        return <span className="flex-shrink-0 text-base leading-none">{node.vibe.emoji}</span>
      }
      return <Target className="h-4 w-4 flex-shrink-0 text-[var(--color-text-secondary)]" />
    case 'group':
      return node.meta?.isCompleted ? (
        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--color-done)]" />
      ) : (
        <Circle className="h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />
      )
    case 'task':
      if (node.meta?.isCompletedTask) {
        return <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--color-done)]" />
      }
      if (node.meta?.isPaused) {
        return <Pause className="h-4 w-4 flex-shrink-0 text-[var(--color-paused)]" />
      }
      if (node.meta?.isDone) {
        return <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--color-done)]" />
      }
      // Default: show repeat type icon
      return node.meta?.repeatType === 'once' ? (
        <Calendar1 className="h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />
      ) : (
        <Repeat className="h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />
      )
  }
}

function ProgressRing({
  doneCount,
  totalCount,
  color,
}: {
  doneCount: number
  totalCount: number
  color?: string
}) {
  const size = 16
  const strokeWidth = 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = totalCount > 0 ? doneCount / totalCount : 0
  const strokeDashoffset = circumference * (1 - progress)
  const ringColor = color ?? 'var(--color-primary-500)'

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="flex-shrink-0 -rotate-90"
      aria-label={`${doneCount}/${totalCount} done`}
    >
      <title>{`${doneCount}/${totalCount} done`}</title>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={strokeWidth}
        opacity={0.4}
      />
      {totalCount > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

function CompactDDayBadge({ targetDate }: { targetDate: string }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(targetDate + 'T00:00:00')
  const days = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const label = days > 0 ? `D-${days}` : days === 0 ? 'D-Day' : `D+${Math.abs(days)}`
  const isUrgent = days <= 3 && days > 0
  const isOverdue = days <= 0

  return (
    <span
      className={cn(
        'flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
        isUrgent
          ? 'bg-[var(--color-miss-bg)] text-[var(--color-miss)]'
          : isOverdue
            ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
      )}
    >
      {label}
    </span>
  )
}

const STREAK_MILESTONES = new Set([3, 7, 14, 30])

function StreakBadge({ streak }: { streak: number }) {
  const isMilestone = STREAK_MILESTONES.has(streak)
  const isMilestonePulse = isMilestone && streak >= 7

  return (
    <motion.span
      className="flex-shrink-0 rounded-full bg-[var(--color-streak-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-streak)]"
      animate={isMilestone ? { scale: [1, 1.4, 1] } : undefined}
      transition={
        isMilestone
          ? {
              duration: 0.6,
              ease: 'easeInOut',
              repeat: isMilestonePulse ? Infinity : 0,
            }
          : undefined
      }
    >
      🔥{streak}
    </motion.span>
  )
}

function NodeBadge({ node }: { node: VisualTreeNode }) {
  // Goal: status dot + progress ring + D-Day + totalStreak
  if (node.type === 'goal') {
    const statusKey = node.status as keyof typeof GOAL_STATUS_CONFIG
    const statusDotColor =
      statusKey === 'active' || statusKey === 'maintenance'
        ? 'var(--color-primary-500)'
        : statusKey === 'completed'
          ? 'var(--color-done)'
          : statusKey === 'paused'
            ? 'var(--color-paused)'
            : statusKey === 'archived'
              ? 'var(--color-archived)'
              : 'var(--color-text-tertiary)'

    const doneCount = node.meta?.doneCount ?? 0
    const totalCount = node.meta?.totalCount ?? node.meta?.count ?? 0
    const showRing = totalCount > 0

    return (
      <div className="ml-auto flex flex-shrink-0 items-center gap-1">
        <span
          className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: statusDotColor }}
        />
        {showRing && (
          <ProgressRing doneCount={doneCount} totalCount={totalCount} color={node.areaColor} />
        )}
        {node.meta?.targetDate && <CompactDDayBadge targetDate={node.meta.targetDate} />}
        {(node.meta?.totalStreak ?? 0) > 0 && <StreakBadge streak={node.meta!.totalStreak!} />}
      </div>
    )
  }

  // Group: count badge
  if (node.type === 'group') {
    const hasCount = !!node.meta?.count
    if (hasCount) {
      return (
        <span className="ml-auto flex-shrink-0 rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
          {node.meta!.count}
        </span>
      )
    }
  }

  // Task: paused/completed badge or streak badge, with optional cross-link icon
  if (node.type === 'task') {
    const badges: React.ReactNode[] = []

    if (node.meta?.hasCrossLinks) {
      badges.push(
        <Link key="link" className="h-3 w-3 flex-shrink-0 text-[var(--color-text-tertiary)]" />
      )
    }

    if (node.meta?.isPaused) {
      badges.push(
        <span
          key="paused"
          className="flex-shrink-0 rounded-full bg-[var(--color-paused-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-paused)]"
        >
          일시정지
        </span>
      )
    } else if (node.meta?.isCompletedTask) {
      badges.push(
        <span
          key="completed"
          className="flex-shrink-0 rounded-full bg-[var(--color-done-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-done)]"
        >
          완료
        </span>
      )
    } else if (node.meta?.streak && node.meta.streak > 0) {
      badges.push(<StreakBadge key="streak" streak={node.meta.streak} />)
    }

    if (badges.length > 0) {
      return <div className="ml-auto flex flex-shrink-0 items-center gap-1">{badges}</div>
    }
    return null
  }

  // Count badge (direction, area)
  if (node.meta?.count) {
    const isDirection = node.type === 'direction'
    return (
      <span
        className={cn(
          'ml-auto flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
          isDirection
            ? 'bg-[var(--color-bg-on-primary)] text-[var(--color-text-on-primary)]'
            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
        )}
      >
        {node.meta.count}
      </span>
    )
  }

  return null
}

function getCardStyles(node: VisualTreeNode): string {
  switch (node.type) {
    case 'direction':
      return 'bg-[var(--color-primary-500)] border-[var(--color-primary-500)] text-[var(--color-text-on-primary)] min-w-[180px] py-3.5'
    case 'area':
      return 'bg-[var(--color-bg-primary)] border-[var(--color-border)] min-w-[140px]'
    case 'goal':
      return 'bg-[var(--color-bg-primary)] border-[var(--color-border)] min-w-[150px]'
    case 'group':
      return 'bg-[var(--color-bg-primary)] border-[var(--color-border)] min-w-[130px]'
    case 'task':
      return cn(
        'bg-[var(--color-bg-primary)] border-[var(--color-border)] min-w-[120px]',
        node.meta?.isDone && 'opacity-60',
        node.meta?.isPaused && 'opacity-60 border-[var(--color-paused)]',
        node.meta?.isCompletedTask && 'opacity-60 border-[var(--color-done)]'
      )
    default:
      return 'border-[var(--color-border)]'
  }
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text
  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return text
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-[var(--color-primary-100)] text-inherit">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  )
}

function getNameStyles(node: VisualTreeNode): string {
  switch (node.type) {
    case 'direction':
      return 'text-base font-bold text-[var(--color-text-on-primary)]'
    case 'area':
      return 'text-[15px] font-semibold text-[var(--color-text-primary)]'
    case 'goal':
      return 'text-sm font-medium text-[var(--color-text-primary)]'
    case 'group':
      return cn(
        'text-[13px] font-medium',
        node.meta?.isCompleted && 'text-[var(--color-text-tertiary)] line-through'
      )
    case 'task':
      return cn(
        'text-[13px] text-[var(--color-text-secondary)]',
        node.meta?.isDone && 'line-through text-[var(--color-text-tertiary)]',
        node.meta?.isPaused && 'text-[var(--color-text-tertiary)]',
        node.meta?.isCompletedTask && 'line-through text-[var(--color-text-tertiary)]'
      )
    default:
      return ''
  }
}
