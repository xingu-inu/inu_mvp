'use client'

import { memo } from 'react'
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
  meta?: {
    count?: number
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
  }
}

interface TreeNodeCardProps {
  node: VisualTreeNode
  isSelected: boolean
  isExpanded: boolean
  hasChildren: boolean
  onSelect: () => void
  onToggle: () => void
}

export const TreeNodeCard = memo(function TreeNodeCard({
  node,
  isSelected,
  isExpanded,
  hasChildren,
  onSelect,
  onToggle,
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
      title={node.type === 'group' && node.why ? node.why : undefined}
      className={cn(
        'group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-xl border-2 px-4 py-2.5 shadow-sm transition-all select-none',
        'hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:outline-none',
        getCardStyles(node),
        isSelected &&
          'shadow-[0_0_0_4px_var(--color-primary-100)] ring-2 ring-[var(--color-primary-500)]/60'
      )}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      {/* Area/Goal 색상 accent bar */}
      {((node.type === 'goal' && node.areaColor) || (node.type === 'area' && node.color)) && (
        <div
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: node.type === 'goal' ? node.areaColor! : node.color! }}
        />
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
          {node.name}
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

function NodeBadge({ node }: { node: VisualTreeNode }) {
  // Goal: status dot + count + D-Day + totalStreak
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

    return (
      <div className="ml-auto flex flex-shrink-0 items-center gap-1">
        <span
          className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: statusDotColor }}
        />
        {node.meta?.count && (
          <span className="flex-shrink-0 rounded-full bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
            {node.meta.count}
          </span>
        )}
        {node.meta?.targetDate && <CompactDDayBadge targetDate={node.meta.targetDate} />}
        {(node.meta?.totalStreak ?? 0) > 0 && (
          <span className="flex-shrink-0 rounded-full bg-[var(--color-streak-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-streak)]">
            🔥{node.meta!.totalStreak}
          </span>
        )}
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
      badges.push(
        <span
          key="streak"
          className="flex-shrink-0 rounded-full bg-[var(--color-streak-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-streak)]"
        >
          🔥{node.meta.streak}
        </span>
      )
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
