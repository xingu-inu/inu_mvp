'use client'

import { memo, useState, useCallback } from 'react'
import { Handle, Position, useUpdateNodeInternals, type Node, type NodeProps } from '@xyflow/react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle2,
  Calendar1,
  Repeat,
  Pause,
  Link,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_CONFIG } from '@/lib/goal-status'
import type { GoalStatus } from '@/types/entities'
import { ZOOM_COMPACT, ZOOM_FULL, type GoalNodeData } from '../types'
import { TreeNodeCard, type VisualTreeNode } from '../../visual-tree/tree-node-card'
import { useCanvasInteractionsContext } from '../canvas-interactions-context'
import { TreeContextMenu } from '../../visual-tree/tree-context-menu'
import { WhyChainTooltip } from './why-chain-tooltip'

// ── Main component ─────────────────────────────────────────

export const GoalNode = memo(function GoalNode({
  id,
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<Node<GoalNodeData, 'goal'>>) {
  const {
    treeNode,
    areaColor,
    ancestorWhys,
    isSelected,
    isSearchMatch,
    searchQuery,
    zoomLevel = ZOOM_FULL,
  } = data
  const hasChildren = !!treeNode.children?.length
  const isDraft = treeNode.status === 'backlog'
  const isCompact = zoomLevel <= ZOOM_COMPACT
  const isFull = zoomLevel >= ZOOM_FULL

  const [isExpandedRaw, setIsExpandedRaw] = useState(false)
  // Only allow expansion in full zoom — AnimatePresence handles exit animation
  const isExpanded = isFull && isExpandedRaw
  const updateNodeInternals = useUpdateNodeInternals()
  const { handleNodeSelect, handleDeleteNode, handleStartAdd, addingToId, getQuickAddContent } =
    useCanvasInteractionsContext()

  const handleToggle = useCallback(() => {
    setIsExpandedRaw((prev) => !prev)
    requestAnimationFrame(() => updateNodeInternals(id))
  }, [id, updateNodeInternals])

  const handleSelect = useCallback(() => {
    handleNodeSelect('goal', id)
  }, [handleNodeSelect, id])

  const onAddChild = useCallback(() => handleStartAdd('goal', id), [handleStartAdd, id])
  const onDelete = useCallback(() => handleDeleteNode('goal', id), [handleDeleteNode, id])

  return (
    <div
      className={cn(
        'group/why max-w-[300px] min-w-[220px]',
        isExpanded && hasChildren && 'nowheel',
        isDraft && 'rounded-xl border-2 border-dashed border-[var(--color-border)]',
        isDraft && '[&_[data-node-card]]:border-transparent'
      )}
    >
      {isFull && ancestorWhys && ancestorWhys.length > 0 && (
        <WhyChainTooltip
          ancestorWhys={ancestorWhys}
          currentName={treeNode.name}
          currentWhy={treeNode.why}
        />
      )}
      <Handle type="target" position={targetPosition ?? Position.Top} />

      {isCompact ? (
        /* Compact zoom: name-only simplified box */
        <div
          className={cn(
            'cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 shadow-sm',
            isSelected && 'ring-2 ring-[var(--color-primary-400)] ring-offset-1',
            isSearchMatch && 'ring-2 ring-[var(--color-warning-400)]'
          )}
          onClick={handleSelect}
        >
          <span className="block truncate text-xs font-medium text-[var(--color-text-primary)]">
            {treeNode.name}
          </span>
        </div>
      ) : (
        <>
          <TreeContextMenu
            node={treeNode}
            onEdit={handleSelect}
            onAddChild={onAddChild}
            onDelete={onDelete}
          >
            <div>
              <TreeNodeCard
                node={treeNode}
                isSelected={isSelected ?? false}
                isExpanded={isExpanded}
                hasChildren={hasChildren}
                onSelect={handleSelect}
                onToggle={handleToggle}
                isSearchMatch={isSearchMatch}
                searchQuery={searchQuery}
              />
            </div>
          </TreeContextMenu>

          {/* Status tag (non-active only) */}
          {(() => {
            if (!treeNode.status || treeNode.status === 'active') return null
            const statusConfig = GOAL_STATUS_CONFIG[treeNode.status as GoalStatus]
            if (!statusConfig) return null
            return (
              <div className="px-3 pb-1">
                <span
                  className={cn(
                    'inline-block rounded-full px-1.5 py-px text-[9px] font-medium',
                    statusConfig.bg,
                    statusConfig.text
                  )}
                >
                  {statusConfig.label}
                </span>
              </div>
            )
          })()}

          {/* Quick-add popover */}
          {addingToId === id && (
            <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2">
              {getQuickAddContent(treeNode)}
            </div>
          )}

          {/* Expanded content: Group → Task list (auto-collapses when leaving full zoom) */}
          <AnimatePresence initial={false}>
            {isExpanded && hasChildren && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
                onAnimationComplete={() => updateNodeInternals(id)}
              >
                <div className="space-y-0.5 border-t border-[var(--color-border)] px-3 py-2">
                  {treeNode.children?.map((child) => (
                    <GoalChildItem key={child.id} node={child} areaColor={areaColor} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <Handle type="source" position={sourcePosition ?? Position.Bottom} />
    </div>
  )
})

// ── Recursive child renderer (Group / Task) ────────────────

const GoalChildItem = memo(function GoalChildItem({
  node,
  areaColor,
  depth = 0,
}: {
  node: VisualTreeNode
  areaColor: string
  depth?: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = !!node.children?.length

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <div className="flex items-center gap-1.5 py-0.5">
        {/* Expand toggle for groups */}
        {hasChildren ? (
          <button
            className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded transition-colors hover:bg-[var(--color-bg-tertiary)]"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* Icon */}
        <ChildIcon node={node} />

        {/* Name */}
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-xs',
            node.type === 'group' && 'font-medium',
            node.type === 'group' &&
              node.meta?.isCompleted &&
              'text-[var(--color-text-tertiary)] line-through',
            node.type === 'task' && 'text-[var(--color-text-secondary)]',
            node.type === 'task' &&
              node.meta?.isDone &&
              'text-[var(--color-text-tertiary)] line-through',
            node.type === 'task' && node.meta?.isPaused && 'text-[var(--color-text-tertiary)]',
            node.type === 'task' &&
              node.meta?.isCompletedTask &&
              'text-[var(--color-text-tertiary)] line-through'
          )}
        >
          {node.name}
        </span>

        {/* Minimal badges */}
        <ChildBadge node={node} />
      </div>

      {/* Nested children */}
      {isOpen &&
        hasChildren &&
        node.children!.map((child) => (
          <GoalChildItem key={child.id} node={child} areaColor={areaColor} depth={depth + 1} />
        ))}
    </div>
  )
})

// ── Sub-components ─────────────────────────────────────────

function ChildIcon({ node }: { node: VisualTreeNode }) {
  if (node.type === 'group') {
    return node.meta?.isCompleted ? (
      <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-[var(--color-done)]" />
    ) : (
      <Circle className="h-3 w-3 flex-shrink-0 text-[var(--color-text-tertiary)]" />
    )
  }

  // Task icons
  if (node.meta?.isCompletedTask || node.meta?.isDone) {
    return <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-[var(--color-done)]" />
  }
  if (node.meta?.isPaused) {
    return <Pause className="h-3 w-3 flex-shrink-0 text-[var(--color-paused)]" />
  }
  return node.meta?.repeatType === 'once' ? (
    <Calendar1 className="h-3 w-3 flex-shrink-0 text-[var(--color-text-tertiary)]" />
  ) : (
    <Repeat className="h-3 w-3 flex-shrink-0 text-[var(--color-text-tertiary)]" />
  )
}

function ChildBadge({ node }: { node: VisualTreeNode }) {
  if (node.type === 'group' && node.meta?.count) {
    return (
      <span className="flex-shrink-0 rounded-full bg-[var(--color-bg-tertiary)] px-1 py-px text-[9px] font-medium text-[var(--color-text-secondary)]">
        {node.meta.count}
      </span>
    )
  }

  if (node.type === 'task') {
    if (node.meta?.hasCrossLinks) {
      return <Link className="h-2.5 w-2.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
    }
    if (node.meta?.streak && node.meta.streak > 0) {
      return (
        <span className="flex-shrink-0 text-[9px] font-semibold text-[var(--color-streak)]">
          🔥{node.meta.streak}
        </span>
      )
    }
  }

  return null
}
