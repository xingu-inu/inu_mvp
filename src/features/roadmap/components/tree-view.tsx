'use client'

import { useState, memo, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
  Compass,
  FolderOpen,
  Target,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_GROUPS } from '@/lib/goal-status'
import { DDayBadge } from '@/components/ui/badge'
import { CrossLinkOverlay } from './cross-link-overlay'
import { buildTreeData, type TreeNode } from '../utils/roadmap-data-utils'
import type { Direction, Area, Goal } from '@/types/entities'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TreeView Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface TreeViewProps {
  direction: Direction | null
  goals: Goal[]
  areas: Area[]
  onGoalSelect: (goalId: string) => void
  isMobile?: boolean
}

export const TreeView = memo(function TreeView({
  direction,
  goals,
  areas,
  onGoalSelect,
  isMobile = false,
}: TreeViewProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const { tree, crossLinks } = useMemo(
    () => buildTreeData(direction, areas, goals),
    [direction, areas, goals]
  )

  const handleGoalSelect = (goalId: string) => {
    if (isMobile) {
      // Mobile: Navigate to goal detail page
      router.push(`/roadmap/${goalId}`)
    } else {
      // Desktop: Open panel
      onGoalSelect(goalId)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl bg-[var(--color-bg-primary)] shadow-[var(--shadow-card)]"
    >
      <TreeNodeComponent
        node={tree}
        level={0}
        onGoalSelect={handleGoalSelect}
        isMobile={isMobile}
      />
      {crossLinks.length > 0 && (
        <CrossLinkOverlay
          containerRef={containerRef}
          crossLinks={crossLinks}
          layoutDirection="list"
        />
      )}
    </div>
  )
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TreeNode Component (Recursive)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface TreeNodeComponentProps {
  node: TreeNode
  level: number
  onGoalSelect: (goalId: string) => void
  isMobile?: boolean
}

const TreeNodeComponent = memo(function TreeNodeComponent({
  node,
  level,
  onGoalSelect,
  isMobile = false,
}: TreeNodeComponentProps) {
  // Default expanded state based on node type
  const getDefaultExpanded = () => {
    if (node.type === 'direction') return true
    if (node.type === 'status-group') {
      const statusConfig = GOAL_STATUS_GROUPS.find((s) => s.id === node.id)
      return statusConfig?.defaultExpanded ?? false
    }
    if (node.type === 'area') return true
    if (node.type === 'goal') return node.status === 'active'
    if (node.type === 'group') return true
    return false
  }

  const [isExpanded, setIsExpanded] = useState(getDefaultExpanded)
  const hasChildren = !!(node.children && node.children.length > 0)

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleClick = () => {
    if (node.type === 'goal') {
      onGoalSelect(node.id)
    } else {
      handleToggle()
    }
  }

  return (
    <div>
      <NodeHeader
        node={node}
        level={level}
        isExpanded={isExpanded}
        hasChildren={hasChildren}
        onToggle={handleToggle}
        onClick={handleClick}
        isMobile={isMobile}
      />

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              onGoalSelect={onGoalSelect}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}
    </div>
  )
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Node Header Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface NodeHeaderProps {
  node: TreeNode
  level: number
  isExpanded: boolean
  hasChildren: boolean
  onToggle: () => void
  onClick: () => void
  isMobile?: boolean
}

const NodeHeader = memo(function NodeHeader({
  node,
  level,
  isExpanded,
  hasChildren,
  onToggle,
  onClick,
  isMobile = false,
}: NodeHeaderProps) {
  const effectiveLevel = isMobile ? Math.min(level, 3) : level
  const indent = isMobile ? 8 : 16
  const base = isMobile ? 8 : 12
  const paddingLeft = base + effectiveLevel * indent

  // Node-specific styles
  const nodeStyles = getNodeStyles(node)

  return (
    <div
      data-node-id={node.id}
      className={cn(
        'flex items-center gap-2 transition-colors',
        nodeStyles.container,
        node.type === 'goal' && 'cursor-pointer'
      )}
      style={{ paddingLeft }}
      onClick={node.type === 'goal' ? onClick : undefined}
    >
      {/* Expand/Collapse Toggle */}
      {hasChildren ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--color-bg-tertiary)] max-lg:h-11 max-lg:w-11"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-[var(--color-text-secondary)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)]" />
          )}
        </button>
      ) : (
        <div className="w-8 max-lg:w-11" />
      )}

      {/* Icon */}
      <NodeIcon node={node} />

      {/* Name */}
      <span className={cn('flex-1 truncate', nodeStyles.name)}>{node.name}</span>

      {/* Meta Info */}
      <NodeMeta node={node} />
    </div>
  )
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Node Icon Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NodeIcon({ node }: { node: TreeNode }) {
  switch (node.type) {
    case 'direction':
      return <Compass className="h-5 w-5 text-[var(--color-primary-500)]" />
    case 'status-group':
      return <FolderOpen className="h-4 w-4 text-[var(--color-text-tertiary)]" />
    case 'area':
      // Area uses its color or emoji
      if (node.color) {
        return (
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full text-xs"
            style={{ backgroundColor: node.color, opacity: 0.8 }}
          >
            {node.emoji && <span className="text-[10px] text-white">{node.emoji}</span>}
          </span>
        )
      }
      return <span className="text-base">{node.emoji}</span>
    case 'goal':
      return <Target className="h-4 w-4 text-[var(--color-primary-500)]" />
    case 'group':
      return (
        <FolderOpen
          className={cn(
            'h-4 w-4',
            node.meta?.isCompleted
              ? 'text-[var(--color-done)]'
              : 'text-[var(--color-text-tertiary)]'
          )}
        />
      )
    case 'task':
      return node.meta?.isDone ? (
        <CheckCircle2 className="h-4 w-4 text-[var(--color-done)]" />
      ) : (
        <Circle className="h-4 w-4 text-[var(--color-text-tertiary)]" />
      )
    default:
      return null
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Node Meta Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NodeMeta({ node }: { node: TreeNode }) {
  // Count badge for status-group and area
  if ((node.type === 'status-group' || node.type === 'area') && node.meta?.count) {
    return (
      <span className="rounded-full bg-[var(--color-border)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-tertiary)]">
        {node.meta.count}
      </span>
    )
  }

  // Completed badge for group
  if (node.type === 'group' && node.meta?.isCompleted) {
    return (
      <span className="rounded-full bg-[var(--color-done-bg)] px-2 py-0.5 text-xs font-medium text-[var(--color-done)]">
        완료
      </span>
    )
  }

  // D-Day for goal (show only when ≤7 days remain)
  if (node.type === 'goal' && node.meta?.targetDate) {
    const today = new Date()
    const target = new Date(node.meta.targetDate)
    const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 7) {
      return <DDayBadge targetDate={node.meta.targetDate} />
    }
  }

  // Streak for task
  if (node.type === 'task' && node.meta?.streak && node.meta.streak > 0) {
    return (
      <span className="rounded-full bg-[var(--color-streak-bg)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-streak)]">
        🔥 {node.meta.streak}
      </span>
    )
  }

  // Why tooltip trigger (just show indicator)
  if (node.why) {
    return (
      <span className="text-xs text-[var(--color-text-tertiary)]" title={node.why}>
        💭
      </span>
    )
  }

  return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Utilities
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getNodeStyles(node: TreeNode) {
  switch (node.type) {
    case 'direction':
      return {
        container: 'py-4 pr-4 bg-[var(--color-bg-secondary)]',
        name: 'text-lg font-bold text-[var(--color-text-primary)]',
      }
    case 'status-group':
      return {
        container: 'py-2.5 pr-4 bg-[var(--color-bg-tertiary)]',
        name: 'text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider',
      }
    case 'area':
      return {
        container: 'py-3 pr-4 hover:bg-[var(--color-bg-secondary)]',
        name: 'text-base font-semibold text-[var(--color-text-primary)]',
      }
    case 'goal':
      return {
        container: 'py-2.5 pr-4 hover:bg-[var(--color-bg-secondary)]',
        name: 'text-[15px] font-medium text-[var(--color-text-primary)]',
      }
    case 'group':
      return {
        container: 'py-2 pr-4',
        name: cn(
          'text-sm font-medium',
          node.meta?.isCompleted && 'text-[var(--color-text-tertiary)] line-through'
        ),
      }
    case 'task':
      return {
        container: 'py-2 pr-4',
        name: cn(
          'text-sm text-[var(--color-text-secondary)]',
          node.meta?.isDone && 'text-[var(--color-text-tertiary)] line-through'
        ),
      }
    default:
      return { container: '', name: '' }
  }
}
